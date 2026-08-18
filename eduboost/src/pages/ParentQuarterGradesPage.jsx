import {
  useEffect,
  useMemo,
  useState,
} from 'react'

import {
  BarChart3,
  BookOpen,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
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
  getStudentFinalQuarterGrades,
  getSupabaseStudentQuarterGrades,
  getSuggestedQuarterGrade,
} from '../services/supabaseJournalService'


const QUARTERS = [
  1,
  2,
  3,
  4,
]


function ParentQuarterGradesPage() {
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
    selectedPeriod,
    setSelectedPeriod,
  ] = useState(1)

  const [
    quarterGrades,
    setQuarterGrades,
  ] = useState({
    1: [],
    2: [],
    3: [],
    4: [],
  })

  const [
    finalGrades,
    setFinalGrades,
  ] = useState([])

  const [
    expandedSubjects,
    setExpandedSubjects,
  ] = useState({})

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
        'Parent link sync error:',
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
      setQuarterGrades({
        1: [],
        2: [],
        3: [],
        4: [],
      })

      setFinalGrades([])
      setLoading(false)

      return
    }


    void loadAllData()
  }, [
    student?.id,
  ])


  async function loadAllData() {
    if (!student?.id) {
      return
    }


    try {
      setLoading(true)
      setError('')


      const [
        firstQuarter,
        secondQuarter,
        thirdQuarter,
        fourthQuarter,
        finalRows,
      ] = await Promise.all([
        getSupabaseStudentQuarterGrades(
          student.id,
          1,
        ),

        getSupabaseStudentQuarterGrades(
          student.id,
          2,
        ),

        getSupabaseStudentQuarterGrades(
          student.id,
          3,
        ),

        getSupabaseStudentQuarterGrades(
          student.id,
          4,
        ),

        getStudentFinalQuarterGrades(
          student.id,
        ),
      ])


      setQuarterGrades({
        1:
          firstQuarter ||
          [],

        2:
          secondQuarter ||
          [],

        3:
          thirdQuarter ||
          [],

        4:
          fourthQuarter ||
          [],
      })


      setFinalGrades(
        finalRows ||
          [],
      )
    } catch (
      loadError
    ) {
      console.error(
        'Quarter grades load error:',
        loadError,
      )


      setQuarterGrades({
        1: [],
        2: [],
        3: [],
        4: [],
      })


      setFinalGrades([])


      setError(
        loadError?.message ||
          'Не удалось загрузить четвертные оценки.',
      )
    } finally {
      setLoading(false)
    }
  }


  const selectedQuarter =
    typeof selectedPeriod ===
      'number'
      ? selectedPeriod
      : null


  const selectedQuarterRows =
    selectedQuarter
      ? quarterGrades[
          selectedQuarter
        ] || []
      : []


  const selectedQuarterSubjects =
    useMemo(
      () => {
        if (
          !selectedQuarter
        ) {
          return []
        }


        const grouped =
          new Map()


        selectedQuarterRows.forEach(
          (
            grade,
          ) => {
            const subject =
              grade.subject ||
              'Без предмета'


            if (
              !grouped.has(
                subject,
              )
            ) {
              grouped.set(
                subject,
                [],
              )
            }


            grouped
              .get(subject)
              .push(
                grade,
              )
          },
        )


        finalGrades
          .filter(
            (
              row,
            ) =>
              Number(
                row.quarter,
              ) ===
              Number(
                selectedQuarter,
              ),
          )
          .forEach(
            (
              row,
            ) => {
              if (
                row.subject &&
                !grouped.has(
                  row.subject,
                )
              ) {
                grouped.set(
                  row.subject,
                  [],
                )
              }
            },
          )


        return [
          ...grouped.entries(),
        ]
          .map(
            (
              [
                subject,
                grades,
              ],
            ) => {
              const sortedGrades =
                [...grades].sort(
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
                )


              const average =
                calculateWeightedAverage(
                  grades,
                )


              const confirmed =
                finalGrades.find(
                  (
                    row,
                  ) =>
                    row.subject ===
                      subject &&
                    Number(
                      row.quarter,
                    ) ===
                      Number(
                        selectedQuarter,
                      ),
                )


              const confirmedGrade =
                getFinalGradeValue(
                  confirmed,
                )


              const predicted =
                average
                  ? getSuggestedQuarterGrade(
                      average,
                    )
                  : null


              return {
                subject,
                grades:
                  sortedGrades,
                average,
                predicted,
                confirmedGrade,
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
      },
      [
        selectedQuarter,
        selectedQuarterRows,
        finalGrades,
      ],
    )


  const allSubjects =
    useMemo(
      () => {
        const names =
          new Set()


        QUARTERS.forEach(
          (
            quarter,
          ) => {
            ;(
              quarterGrades[
                quarter
              ] || []
            ).forEach(
              (
                grade,
              ) => {
                if (
                  grade.subject
                ) {
                  names.add(
                    grade.subject,
                  )
                }
              },
            )
          },
        )


        finalGrades.forEach(
          (
            row,
          ) => {
            if (
              row.subject
            ) {
              names.add(
                row.subject,
              )
            }
          },
        )


        return [
          ...names,
        ].sort(
          (
            first,
            second,
          ) =>
            first.localeCompare(
              second,
              'ru',
            ),
        )
      },
      [
        quarterGrades,
        finalGrades,
      ],
    )


  const finalRows =
    useMemo(
      () =>
        allSubjects.map(
          (
            subject,
          ) => {
            const quarters =
              {}


            QUARTERS.forEach(
              (
                quarter,
              ) => {
                const grades =
                  (
                    quarterGrades[
                      quarter
                    ] ||
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
                    grades,
                  )


                const confirmed =
                  finalGrades.find(
                    (
                      row,
                    ) =>
                      row.subject ===
                        subject &&
                      Number(
                        row.quarter,
                      ) ===
                        quarter,
                  )


                const finalGrade =
                  getFinalGradeValue(
                    confirmed,
                  )


                const prediction =
                  average
                    ? getSuggestedQuarterGrade(
                        average,
                      )
                    : null


                quarters[
                  quarter
                ] = {
                  finalGrade,
                  prediction,
                  average,
                  confirmed:
                    finalGrade !==
                    null,
                }
              },
            )


            const values =
              QUARTERS
                .map(
                  (
                    quarter,
                  ) =>
                    quarters[
                      quarter
                    ].finalGrade ??
                    quarters[
                      quarter
                    ].prediction,
                )
                .map(
                  Number,
                )
                .filter(
                  (
                    value,
                  ) =>
                    Number.isFinite(
                      value,
                    ) &&
                    value > 0,
                )


            const confirmedCount =
              QUARTERS.filter(
                (
                  quarter,
                ) =>
                  quarters[
                    quarter
                  ].confirmed,
              ).length


            const yearAverage =
              values.length > 0
                ? values.reduce(
                    (
                      sum,
                      value,
                    ) =>
                      sum +
                      value,
                    0,
                  ) /
                  values.length
                : null


            const yearGrade =
              yearAverage
                ? getSuggestedQuarterGrade(
                    yearAverage,
                  )
                : null


            return {
              subject,
              quarters,
              yearGrade,
              yearConfirmed:
                confirmedCount ===
                4,
            }
          },
        ),
      [
        allSubjects,
        quarterGrades,
        finalGrades,
      ],
    )


  const selectedQuarterAverage =
    useMemo(
      () => {
        if (
          selectedQuarterSubjects.length ===
          0
        ) {
          return null
        }


        const averages =
          selectedQuarterSubjects
            .map(
              (
                item,
              ) =>
                Number(
                  item.average,
                ),
            )
            .filter(
              (
                value,
              ) =>
                Number.isFinite(
                  value,
                ) &&
                value > 0,
            )


        if (
          averages.length ===
          0
        ) {
          return null
        }


        return Number(
          (
            averages.reduce(
              (
                sum,
                value,
              ) =>
                sum +
                value,
              0,
            ) /
            averages.length
          ).toFixed(
            2,
          ),
        )
      },
      [
        selectedQuarterSubjects,
      ],
    )


  const selectedConfirmedCount =
    useMemo(
      () =>
        selectedQuarterSubjects.filter(
          (
            item,
          ) =>
            item.confirmedGrade !==
            null,
        ).length,
      [
        selectedQuarterSubjects,
      ],
    )


  function toggleSubject(
    subject,
  ) {
    setExpandedSubjects(
      (
        current,
      ) => ({
        ...current,
        [subject]:
          !current[
            subject
          ],
      }),
    )
  }


  if (
    user?.role !==
    'Родитель'
  ) {
    return (
      <>
        <QuarterStyles />

        <div className="pq-page">

          <QuarterEmpty
            icon={
              UserRound
            }
            title="Доступ запрещён"
            text="Четвертные оценки доступны только родителю."
          />

        </div>
      </>
    )
  }


  if (!student) {
    return (
      <>
        <QuarterStyles />

        <div className="pq-page">

          <QuarterEmpty
            icon={
              UserRound
            }
            title="Ребёнок не привязан"
            text="Сначала привяжите ребёнка в родительском кабинете."
          />

        </div>
      </>
    )
  }


  return (
    <>
      <QuarterStyles />


      <div className="pq-page">

        <header className="pq-header">

          <div>

            <span>
              Успеваемость
            </span>

            <h1>
              Четвертные оценки
            </h1>

            <p>
              Просматривайте результаты
              отдельно за каждую четверть
              или откройте итоговую
              сводку за год.
            </p>

          </div>


          <button
            type="button"
            className="pq-refresh"
            onClick={
              loadAllData
            }
            disabled={
              loading
            }
            aria-label="Обновить"
          >
            <RefreshCcw
              size={19}
            />
          </button>

        </header>


        <section className="pq-student">

          <div className="pq-avatar">
            {getInitials(
              student.name,
            )}
          </div>


          <div className="pq-student-main">

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


            <div className="pq-student-meta">

              <small>

                <School
                  size={13}
                />

                {student.school ||
                  'Школа не указана'}

              </small>


              <small>

                <GraduationCap
                  size={13}
                />

                {student.className ||
                  student.class_name ||
                  'Класс не указан'}

              </small>

            </div>

          </div>

        </section>


        <section className="pq-periods">

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
                  selectedPeriod ===
                  quarter
                    ? 'active'
                    : ''
                }
                onClick={() =>
                  setSelectedPeriod(
                    quarter,
                  )
                }
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


          <button
            type="button"
            className={`pq-final-tab ${
              selectedPeriod ===
              'final'
                ? 'active'
                : ''
            }`}
            onClick={() =>
              setSelectedPeriod(
                'final',
              )
            }
          >

            <BarChart3
              size={17}
            />

            <span>
              Итоговые
            </span>

          </button>

        </section>


        {error && (
          <div className="pq-error">
            {error}
          </div>
        )}


        {selectedPeriod !==
        'final' ? (
          <>

            <section className="pq-quarter-heading">

              <div>

                <span>
                  Период
                </span>

                <h2>
                  {
                    selectedPeriod
                  } четверть
                </h2>

              </div>


              <div className="pq-quarter-badge">
                {
                  selectedPeriod
                }
              </div>

            </section>


            <section className="pq-summary">

              <SummaryItem
                label="Предметов"
                value={
                  selectedQuarterSubjects.length
                }
              />


              <SummaryItem
                label="Средний балл"
                value={
                  selectedQuarterAverage ??
                  '—'
                }
              />


              <SummaryItem
                label="Итоговых"
                value={
                  selectedConfirmedCount
                }
              />

            </section>


            <section className="pq-content-card">

              <div className="pq-card-heading">

                <div>

                  <span>
                    {
                      selectedPeriod
                    } четверть
                  </span>

                  <h2>
                    Предметы
                  </h2>

                </div>


                <BookOpen
                  size={20}
                />

              </div>


              {loading ? (
                <QuarterEmpty
                  icon={
                    RefreshCcw
                  }
                  title="Загрузка"
                  text="Получаем оценки за выбранную четверть."
                />
              ) : selectedQuarterSubjects.length ===
                0 ? (
                <QuarterEmpty
                  icon={
                    BookOpen
                  }
                  title="Оценок пока нет"
                  text={`За ${selectedPeriod} четверть учитель ещё не выставил оценки.`}
                />
              ) : (
                <div className="pq-subject-list">

                  {selectedQuarterSubjects.map(
                    (
                      item,
                    ) => {
                      const expanded =
                        Boolean(
                          expandedSubjects[
                            item.subject
                          ],
                        )


                      const displayGrade =
                        item.confirmedGrade ??
                        item.predicted


                      return (
                        <article
                          className="pq-subject"
                          key={
                            item.subject
                          }
                        >

                          <button
                            type="button"
                            className="pq-subject-header"
                            onClick={() =>
                              toggleSubject(
                                item.subject,
                              )
                            }
                          >

                            <div className="pq-subject-icon">
                              <BookOpen
                                size={18}
                              />
                            </div>


                            <div className="pq-subject-title">

                              <strong>
                                {
                                  item.subject
                                }
                              </strong>


                              <span>
                                {item.grades.length >
                                0
                                  ? `${item.grades.length} ${getGradeWord(
                                      item.grades.length,
                                    )}`
                                  : 'Нет текущих оценок'}
                              </span>

                            </div>


                            <div className="pq-subject-result">

                              <small>
                                Средний
                              </small>

                              <strong>
                                {formatAverage(
                                  item.average,
                                )}
                              </strong>

                            </div>


                            <div className="pq-subject-quarter">

                              <small>
                                {item.confirmedGrade !==
                                null
                                  ? 'Итог'
                                  : 'Прогноз'}
                              </small>


                              <GradeBadge
                                value={
                                  displayGrade
                                }
                                confirmed={
                                  item.confirmedGrade !==
                                  null
                                }
                              />

                            </div>


                            {expanded ? (
                              <ChevronDown
                                className="pq-expand-icon"
                                size={18}
                              />
                            ) : (
                              <ChevronRight
                                className="pq-expand-icon"
                                size={18}
                              />
                            )}

                          </button>


                          {expanded && (
                            <div className="pq-subject-details">

                              <div className="pq-detail-summary">

                                <div>

                                  <span>
                                    Средний балл
                                  </span>

                                  <strong>
                                    {formatAverage(
                                      item.average,
                                    )}
                                  </strong>

                                </div>


                                <div>

                                  <span>
                                    {item.confirmedGrade !==
                                    null
                                      ? 'Четвертная'
                                      : 'Прогноз'}
                                  </span>

                                  <strong>
                                    {displayGrade ||
                                      '—'}
                                  </strong>

                                </div>


                                <div>

                                  <span>
                                    Статус
                                  </span>

                                  <strong
                                    className={
                                      item.confirmedGrade !==
                                      null
                                        ? 'confirmed-text'
                                        : 'forecast-text'
                                    }
                                  >
                                    {item.confirmedGrade !==
                                    null
                                      ? 'Подтверждено'
                                      : 'Предварительно'}
                                  </strong>

                                </div>

                              </div>


                              {item.grades.length >
                              0 ? (
                                <div className="pq-grade-history">

                                  <div className="pq-grade-history-title">
                                    Текущие оценки
                                  </div>


                                  {item.grades.map(
                                    (
                                      grade,
                                    ) => (
                                      <div
                                        className="pq-grade-row"
                                        key={
                                          grade.id
                                        }
                                      >

                                        <div className="pq-grade-row-main">

                                          <strong>
                                            {grade.topic ||
                                              grade.comment ||
                                              'Оценка'}
                                          </strong>

                                          <span>
                                            {formatDate(
                                              grade.date,
                                            )}
                                          </span>

                                        </div>


                                        <GradeBadge
                                          value={
                                            grade.value
                                          }
                                          confirmed
                                          compact
                                        />

                                      </div>
                                    ),
                                  )}

                                </div>
                              ) : (
                                <div className="pq-no-current-grades">
                                  Текущих оценок по предмету пока нет.
                                </div>
                              )}

                            </div>
                          )}

                        </article>
                      )
                    },
                  )}

                </div>
              )}

            </section>

          </>
        ) : (
          <FinalView
            rows={
              finalRows
            }
            loading={
              loading
            }
          />
        )}


        <section className="pq-legend">

          <div>

            <span className="pq-legend-dot confirmed" />

            <small>
              Подтверждено учителем
            </small>

          </div>


          <div>

            <span className="pq-legend-dot forecast" />

            <small>
              Предварительный прогноз
            </small>

          </div>

        </section>

      </div>
    </>
  )
}


function FinalView({
  rows,
  loading,
}) {
  return (
    <>
      <section className="pq-quarter-heading">

        <div>

          <span>
            Учебный год
          </span>

          <h2>
            Итоговые оценки
          </h2>

        </div>


        <div className="pq-final-heading-icon">
          <BarChart3
            size={20}
          />
        </div>

      </section>


      <section className="pq-content-card">

        <div className="pq-card-heading">

          <div>

            <span>
              Общая сводка
            </span>

            <h2>
              Все четверти
            </h2>

          </div>


          <GraduationCap
            size={20}
          />

        </div>


        {loading ? (
          <QuarterEmpty
            icon={
              RefreshCcw
            }
            title="Загрузка"
            text="Получаем итоговые оценки."
          />
        ) : rows.length ===
          0 ? (
          <QuarterEmpty
            icon={
              BarChart3
            }
            title="Итогов пока нет"
            text="После выставления четвертных оценок здесь появится годовая сводка."
          />
        ) : (
          <>
            <div className="pq-final-desktop">

              <div className="pq-final-table">

                <div className="pq-final-header">

                  <div>
                    Предмет
                  </div>

                  <div>
                    I
                  </div>

                  <div>
                    II
                  </div>

                  <div>
                    III
                  </div>

                  <div>
                    IV
                  </div>

                  <div className="pq-year-column">
                    Год
                  </div>

                </div>


                {rows.map(
                  (
                    row,
                  ) => (
                    <div
                      className="pq-final-row"
                      key={
                        row.subject
                      }
                    >

                      <div className="pq-final-subject">

                        <BookOpen
                          size={16}
                        />

                        <strong>
                          {
                            row.subject
                          }
                        </strong>

                      </div>


                      {QUARTERS.map(
                        (
                          quarter,
                        ) => {
                          const data =
                            row.quarters[
                              quarter
                            ]


                          return (
                            <FinalGradeCell
                              key={
                                quarter
                              }
                              value={
                                data.finalGrade ??
                                data.prediction
                              }
                              confirmed={
                                data.confirmed
                              }
                            />
                          )
                        },
                      )}


                      <FinalGradeCell
                        value={
                          row.yearGrade
                        }
                        confirmed={
                          row.yearConfirmed
                        }
                        year
                      />

                    </div>
                  ),
                )}

              </div>

            </div>


            <div className="pq-final-mobile">

              {rows.map(
                (
                  row,
                ) => (
                  <article
                    className="pq-final-mobile-card"
                    key={
                      row.subject
                    }
                  >

                    <div className="pq-final-mobile-title">

                      <div>
                        <BookOpen
                          size={17}
                        />
                      </div>

                      <strong>
                        {
                          row.subject
                        }
                      </strong>

                    </div>


                    <div className="pq-final-mobile-quarters">

                      {QUARTERS.map(
                        (
                          quarter,
                        ) => {
                          const data =
                            row.quarters[
                              quarter
                            ]


                          return (
                            <div
                              key={
                                quarter
                              }
                            >

                              <span>
                                {
                                  quarter
                                }
                              </span>

                              <GradeBadge
                                value={
                                  data.finalGrade ??
                                  data.prediction
                                }
                                confirmed={
                                  data.confirmed
                                }
                                compact
                              />

                            </div>
                          )
                        },
                      )}

                    </div>


                    <div className="pq-final-mobile-year">

                      <span>
                        За год
                      </span>

                      <GradeBadge
                        value={
                          row.yearGrade
                        }
                        confirmed={
                          row.yearConfirmed
                        }
                      />

                    </div>

                  </article>
                ),
              )}

            </div>
          </>
        )}

      </section>
    </>
  )
}


function FinalGradeCell({
  value,
  confirmed,
  year = false,
}) {
  return (
    <div
      className={
        year
          ? 'pq-final-cell year'
          : 'pq-final-cell'
      }
    >
      <GradeBadge
        value={
          value
        }
        confirmed={
          confirmed
        }
        compact
      />
    </div>
  )
}


function SummaryItem({
  label,
  value,
}) {
  return (
    <div>

      <span>
        {label}
      </span>

      <strong>
        {value}
      </strong>

    </div>
  )
}


function GradeBadge({
  value,
  confirmed = false,
  compact = false,
}) {
  const gradeClass =
    getGradeClass(
      value,
    )


  return (
    <div
      className={`pq-grade-badge ${gradeClass} ${
        confirmed
          ? 'confirmed'
          : 'forecast'
      } ${
        compact
          ? 'compact'
          : ''
      }`}
    >
      {value ||
        '—'}
    </div>
  )
}


function QuarterEmpty({
  icon: Icon,
  title,
  text,
}) {
  return (
    <div className="pq-empty">

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


function getFinalGradeValue(
  row,
) {
  if (!row) {
    return null
  }


  const candidates = [
    row.finalGrade,
    row.final_grade,
    row.grade,
  ]


  for (
    const candidate
    of candidates
  ) {
    const numeric =
      Number(
        candidate,
      )


    if (
      Number.isFinite(
        numeric,
      ) &&
      numeric > 0
    ) {
      return numeric
    }
  }


  return null
}


function getGradeClass(
  value,
) {
  const grade =
    Number(value)


  if (
    !Number.isFinite(
      grade,
    ) ||
    grade <= 0
  ) {
    return 'empty'
  }


  if (
    grade >= 5
  ) {
    return 'five'
  }


  if (
    grade >= 4
  ) {
    return 'four'
  }


  if (
    grade >= 3
  ) {
    return 'three'
  }


  return 'two'
}


function formatAverage(
  value,
) {
  const numeric =
    Number(value)


  if (
    !Number.isFinite(
      numeric,
    ) ||
    numeric <= 0
  ) {
    return '—'
  }


  return Number(
    numeric.toFixed(
      2,
    ),
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
      day:
        '2-digit',

      month:
        '2-digit',

      year:
        'numeric',
    },
  )
}


function getGradeWord(
  count,
) {
  const value =
    Math.abs(
      Number(
        count,
      ),
    ) % 100

  const last =
    value % 10


  if (
    value >= 11 &&
    value <= 19
  ) {
    return 'оценок'
  }


  if (
    last === 1
  ) {
    return 'оценка'
  }


  if (
    last >= 2 &&
    last <= 4
  ) {
    return 'оценки'
  }


  return 'оценок'
}


function QuarterStyles() {
  return (
    <style>{`
      .pq-page,
      .pq-page * {
        box-sizing: border-box;
      }

      .pq-page {
        width: min(980px, 100%);
        display: grid;
        gap: 14px;
        margin: 0 auto;
        padding-bottom: 34px;
        color: #334155;
      }

      .pq-header {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 14px;
      }

      .pq-header > div > span,
      .pq-card-heading span,
      .pq-quarter-heading > div > span {
        display: block;
        color: #94a3b8;
        font-size: 9px;
        font-weight: 900;
        letter-spacing: .07em;
        text-transform: uppercase;
      }

      .pq-header h1 {
        margin: 4px 0 0;
        color: #172554;
        font-size: 26px;
        line-height: 1.1;
      }

      .pq-header p {
        max-width: 500px;
        margin: 7px 0 0;
        color: #64748b;
        font-size: 11px;
        line-height: 1.5;
      }

      .pq-refresh {
        width: 42px;
        height: 42px;
        flex: 0 0 42px;
        display: grid;
        place-items: center;
        padding: 0;
        border: 1px solid #dbe5f0;
        border-radius: 13px;
        background: #ffffff;
        color: #2563eb;
        cursor: pointer;
      }

      .pq-refresh:disabled {
        opacity: .5;
      }

      .pq-student {
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

      .pq-avatar {
        width: 46px;
        height: 46px;
        flex: 0 0 46px;
        display: grid;
        place-items: center;
        border-radius: 14px;
        background:
          linear-gradient(
            145deg,
            #2563eb,
            #4f46e5
          );
        color: #ffffff;
        font-size: 13px;
        font-weight: 900;
      }

      .pq-student-main {
        flex: 1;
        min-width: 0;
      }

      .pq-student-main > span {
        display: block;
        color: #94a3b8;
        font-size: 8px;
        font-weight: 900;
        text-transform: uppercase;
      }

      .pq-student-main > strong {
        display: block;
        margin-top: 2px;
        color: #172554;
        font-size: 14px;
      }

      .pq-student-main select {
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

      .pq-student-meta {
        display: flex;
        flex-wrap: wrap;
        gap: 5px 12px;
        margin-top: 5px;
      }

      .pq-student-meta small {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        color: #64748b;
        font-size: 9px;
      }

      .pq-periods {
        display: grid;
        grid-template-columns:
          repeat(4, minmax(0, 1fr))
          minmax(110px, 1.3fr);
        gap: 7px;
      }

      .pq-periods button {
        min-height: 58px;
        padding: 8px 5px;
        border: 1px solid #dbe5f0;
        border-radius: 14px;
        background: #ffffff;
        color: #64748b;
        cursor: pointer;
        transition:
          transform .15s ease,
          border-color .15s ease,
          background .15s ease;
      }

      .pq-periods button:hover {
        border-color: #93c5fd;
      }

      .pq-periods button strong,
      .pq-periods button span {
        display: block;
      }

      .pq-periods button strong {
        color: #172554;
        font-size: 17px;
      }

      .pq-periods button span {
        margin-top: 2px;
        font-size: 8px;
        font-weight: 800;
      }

      .pq-periods button.active {
        border-color: transparent;
        background:
          linear-gradient(
            145deg,
            #2563eb,
            #4f46e5
          );
        color: rgba(255,255,255,.8);
        box-shadow:
          0 7px 18px
          rgba(37,99,235,.18);
      }

      .pq-periods button.active strong {
        color: #ffffff;
      }

      .pq-final-tab {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 6px;
        color: #4f46e5 !important;
      }

      .pq-final-tab.active {
        color: #ffffff !important;
      }

      .pq-final-tab span {
        margin: 0 !important;
        font-size: 9px !important;
      }

      .pq-quarter-heading {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 10px;
        padding: 2px 2px 0;
      }

      .pq-quarter-heading h2 {
        margin: 3px 0 0;
        color: #172554;
        font-size: 20px;
      }

      .pq-quarter-badge {
        width: 42px;
        height: 42px;
        display: grid;
        place-items: center;
        border-radius: 13px;
        background: #eff6ff;
        color: #2563eb;
        font-size: 18px;
        font-weight: 900;
      }

      .pq-final-heading-icon {
        width: 42px;
        height: 42px;
        display: grid;
        place-items: center;
        border-radius: 13px;
        background: #eef2ff;
        color: #4f46e5;
      }

      .pq-summary {
        display: grid;
        grid-template-columns:
          repeat(3, minmax(0, 1fr));
        gap: 7px;
      }

      .pq-summary > div {
        padding: 12px 7px;
        border: 1px solid #e5edf6;
        border-radius: 15px;
        background: #ffffff;
        text-align: center;
      }

      .pq-summary span,
      .pq-summary strong {
        display: block;
      }

      .pq-summary span {
        color: #94a3b8;
        font-size: 8px;
        font-weight: 800;
      }

      .pq-summary strong {
        margin-top: 3px;
        color: #172554;
        font-size: 19px;
      }

      .pq-content-card {
        min-width: 0;
        padding: 15px;
        border: 1px solid #e5edf6;
        border-radius: 19px;
        background: #ffffff;
      }

      .pq-card-heading {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 10px;
        margin-bottom: 13px;
      }

      .pq-card-heading h2 {
        margin: 3px 0 0;
        color: #172554;
        font-size: 17px;
      }

      .pq-card-heading > svg {
        color: #4f46e5;
      }

      .pq-subject-list {
        display: grid;
        gap: 8px;
      }

      .pq-subject {
        overflow: hidden;
        border: 1px solid #e7edf5;
        border-radius: 15px;
        background: #fbfdff;
      }

      .pq-subject-header {
        width: 100%;
        display: grid;
        grid-template-columns:
          40px minmax(0, 1fr)
          72px 72px 18px;
        align-items: center;
        gap: 8px;
        padding: 10px;
        border: 0;
        background: transparent;
        color: inherit;
        text-align: left;
        cursor: pointer;
      }

      .pq-subject-icon {
        width: 38px;
        height: 38px;
        display: grid;
        place-items: center;
        border-radius: 11px;
        background: #eff6ff;
        color: #2563eb;
      }

      .pq-subject-title {
        min-width: 0;
      }

      .pq-subject-title strong,
      .pq-subject-title span {
        display: block;
      }

      .pq-subject-title strong {
        overflow: hidden;
        color: #172554;
        font-size: 11px;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .pq-subject-title span {
        margin-top: 2px;
        color: #94a3b8;
        font-size: 8px;
      }

      .pq-subject-result,
      .pq-subject-quarter {
        text-align: center;
      }

      .pq-subject-result small,
      .pq-subject-quarter small {
        display: block;
        margin-bottom: 3px;
        color: #94a3b8;
        font-size: 7px;
        font-weight: 800;
      }

      .pq-subject-result strong {
        color: #172554;
        font-size: 15px;
      }

      .pq-expand-icon {
        color: #94a3b8;
      }

      .pq-subject-details {
        padding: 0 11px 11px;
        border-top: 1px solid #edf2f7;
        background: #ffffff;
      }

      .pq-detail-summary {
        display: grid;
        grid-template-columns:
          repeat(3, minmax(0, 1fr));
        gap: 6px;
        padding-top: 10px;
      }

      .pq-detail-summary > div {
        padding: 9px 5px;
        border-radius: 11px;
        background: #f8fafc;
        text-align: center;
      }

      .pq-detail-summary span,
      .pq-detail-summary strong {
        display: block;
      }

      .pq-detail-summary span {
        color: #94a3b8;
        font-size: 7px;
      }

      .pq-detail-summary strong {
        margin-top: 3px;
        color: #172554;
        font-size: 12px;
      }

      .pq-detail-summary .confirmed-text {
        color: #15803d;
        font-size: 9px;
      }

      .pq-detail-summary .forecast-text {
        color: #4f46e5;
        font-size: 9px;
      }

      .pq-grade-history {
        margin-top: 10px;
      }

      .pq-grade-history-title {
        margin-bottom: 6px;
        color: #64748b;
        font-size: 8px;
        font-weight: 900;
        text-transform: uppercase;
      }

      .pq-grade-row {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 8px 0;
        border-bottom: 1px solid #f1f5f9;
      }

      .pq-grade-row:last-child {
        border-bottom: 0;
      }

      .pq-grade-row-main {
        flex: 1;
        min-width: 0;
      }

      .pq-grade-row-main strong,
      .pq-grade-row-main span {
        display: block;
      }

      .pq-grade-row-main strong {
        overflow: hidden;
        color: #172554;
        font-size: 9px;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .pq-grade-row-main span {
        margin-top: 2px;
        color: #94a3b8;
        font-size: 7px;
      }

      .pq-no-current-grades {
        margin-top: 10px;
        padding: 9px;
        border-radius: 10px;
        background: #f8fafc;
        color: #64748b;
        font-size: 8px;
        text-align: center;
      }

      .pq-grade-badge {
        width: 37px;
        height: 37px;
        display: grid;
        place-items: center;
        border-radius: 11px;
        font-size: 15px;
        font-weight: 900;
      }

      .pq-grade-badge.compact {
        width: 32px;
        height: 32px;
        border-radius: 9px;
        font-size: 13px;
      }

      .pq-grade-badge.five {
        background: #dcfce7;
        color: #15803d;
      }

      .pq-grade-badge.four {
        background: #dbeafe;
        color: #1d4ed8;
      }

      .pq-grade-badge.three {
        background: #fef3c7;
        color: #b45309;
      }

      .pq-grade-badge.two {
        background: #fee2e2;
        color: #b91c1c;
      }

      .pq-grade-badge.empty {
        background: #f1f5f9;
        color: #94a3b8;
      }

      .pq-grade-badge.forecast:not(.empty) {
        outline:
          1px dashed
          currentColor;
        outline-offset: -3px;
      }

      .pq-final-table {
        overflow: hidden;
        min-width: 680px;
        border: 1px solid #e7edf5;
        border-radius: 14px;
      }

      .pq-final-header,
      .pq-final-row {
        display: grid;
        grid-template-columns:
          minmax(200px, 2fr)
          repeat(4, minmax(60px, .65fr))
          minmax(70px, .75fr);
        align-items: stretch;
      }

      .pq-final-header {
        background: #f8fafc;
        color: #64748b;
        font-size: 8px;
        font-weight: 900;
        text-transform: uppercase;
      }

      .pq-final-header > div {
        min-height: 40px;
        display: grid;
        place-items: center;
        padding: 6px;
        border-right: 1px solid #e7edf5;
      }

      .pq-final-header > div:first-child {
        place-items: center start;
        padding-left: 12px;
      }

      .pq-final-header > div:last-child {
        border-right: 0;
      }

      .pq-year-column {
        color: #4f46e5;
      }

      .pq-final-row {
        border-top: 1px solid #edf2f7;
      }

      .pq-final-row > div {
        border-right: 1px solid #edf2f7;
      }

      .pq-final-row > div:last-child {
        border-right: 0;
      }

      .pq-final-subject {
        display: flex;
        align-items: center;
        gap: 7px;
        min-width: 0;
        padding: 9px 11px;
        color: #2563eb;
      }

      .pq-final-subject strong {
        overflow: hidden;
        color: #172554;
        font-size: 10px;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .pq-final-cell {
        min-height: 57px;
        display: grid;
        place-items: center;
        padding: 5px;
      }

      .pq-final-cell.year {
        background:
          linear-gradient(
            180deg,
            #fafaff,
            #f5f3ff
          );
      }

      .pq-final-desktop {
        overflow-x: auto;
      }

      .pq-final-mobile {
        display: none;
      }

      .pq-final-mobile-card {
        padding: 10px;
        border: 1px solid #e7edf5;
        border-radius: 14px;
        background: #fbfdff;
      }

      .pq-final-mobile-title {
        display: flex;
        align-items: center;
        gap: 8px;
      }

      .pq-final-mobile-title > div {
        width: 34px;
        height: 34px;
        display: grid;
        place-items: center;
        border-radius: 10px;
        background: #eff6ff;
        color: #2563eb;
      }

      .pq-final-mobile-title strong {
        color: #172554;
        font-size: 11px;
      }

      .pq-final-mobile-quarters {
        display: grid;
        grid-template-columns:
          repeat(4, minmax(0, 1fr));
        gap: 5px;
        margin-top: 9px;
      }

      .pq-final-mobile-quarters > div {
        display: grid;
        justify-items: center;
        gap: 4px;
        padding: 7px 2px;
        border-radius: 10px;
        background: #ffffff;
      }

      .pq-final-mobile-quarters span {
        color: #94a3b8;
        font-size: 7px;
        font-weight: 900;
      }

      .pq-final-mobile-year {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
        margin-top: 8px;
        padding: 7px 9px;
        border-radius: 10px;
        background: #eef2ff;
      }

      .pq-final-mobile-year > span {
        color: #4f46e5;
        font-size: 8px;
        font-weight: 900;
      }

      .pq-legend {
        display: flex;
        flex-wrap: wrap;
        gap: 8px 16px;
        padding: 0 2px;
      }

      .pq-legend > div {
        display: inline-flex;
        align-items: center;
        gap: 5px;
      }

      .pq-legend-dot {
        width: 8px;
        height: 8px;
        border-radius: 50%;
      }

      .pq-legend-dot.confirmed {
        background: #2563eb;
      }

      .pq-legend-dot.forecast {
        border: 1px dashed #64748b;
      }

      .pq-legend small {
        color: #64748b;
        font-size: 8px;
      }

      .pq-error {
        padding: 10px 12px;
        border: 1px solid #fecaca;
        border-radius: 12px;
        background: #fef2f2;
        color: #b91c1c;
        font-size: 9px;
        font-weight: 800;
      }

      .pq-empty {
        display: flex;
        align-items: center;
        gap: 10px;
        min-height: 100px;
        padding: 14px;
        border: 1px dashed #dbe5f0;
        border-radius: 14px;
        background: #fbfdff;
      }

      .pq-empty > div {
        width: 40px;
        height: 40px;
        flex: 0 0 40px;
        display: grid;
        place-items: center;
        border-radius: 12px;
        background: #eff6ff;
        color: #2563eb;
      }

      .pq-empty strong,
      .pq-empty small {
        display: block;
      }

      .pq-empty strong {
        color: #172554;
        font-size: 11px;
      }

      .pq-empty small {
        margin-top: 3px;
        color: #64748b;
        font-size: 8px;
        line-height: 1.45;
      }

      @media (
        max-width: 700px
      ) {
        .pq-periods {
          grid-template-columns:
            repeat(4, minmax(0, 1fr));
        }

        .pq-final-tab {
          grid-column: 1 / -1;
          min-height: 44px !important;
        }

        .pq-subject-header {
          grid-template-columns:
            38px minmax(0, 1fr)
            55px 52px 16px;
          gap: 6px;
          padding: 9px;
        }

        .pq-subject-result small,
        .pq-subject-quarter small {
          font-size: 6px;
        }

        .pq-subject-result strong {
          font-size: 13px;
        }

        .pq-final-desktop {
          display: none;
        }

        .pq-final-mobile {
          display: grid;
          gap: 8px;
        }
      }

      @media (
        max-width: 520px
      ) {
        .pq-page {
          gap: 12px;
          padding-bottom: 24px;
        }

        .pq-header h1 {
          font-size: 22px;
        }

        .pq-header p {
          font-size: 10px;
        }

        .pq-student {
          padding: 11px;
          border-radius: 16px;
        }

        .pq-avatar {
          width: 42px;
          height: 42px;
          flex-basis: 42px;
        }

        .pq-periods {
          gap: 5px;
        }

        .pq-periods button {
          min-height: 53px;
          border-radius: 12px;
        }

        .pq-periods button strong {
          font-size: 15px;
        }

        .pq-periods button span {
          font-size: 7px;
        }

        .pq-quarter-heading h2 {
          font-size: 18px;
        }

        .pq-summary {
          gap: 5px;
        }

        .pq-summary > div {
          padding: 10px 4px;
          border-radius: 12px;
        }

        .pq-summary span {
          font-size: 7px;
        }

        .pq-summary strong {
          font-size: 16px;
        }

        .pq-content-card {
          padding: 11px;
          border-radius: 16px;
        }

        .pq-subject-header {
          grid-template-columns:
            35px minmax(0, 1fr)
            46px 40px 14px;
          gap: 5px;
          padding: 8px;
        }

        .pq-subject-icon {
          width: 34px;
          height: 34px;
        }

        .pq-subject-title strong {
          font-size: 10px;
        }

        .pq-subject-title span {
          font-size: 7px;
        }

        .pq-subject-result strong {
          font-size: 12px;
        }

        .pq-grade-badge {
          width: 33px;
          height: 33px;
          border-radius: 10px;
          font-size: 13px;
        }

        .pq-grade-badge.compact {
          width: 29px;
          height: 29px;
          font-size: 12px;
        }

        .pq-detail-summary > div {
          padding: 7px 3px;
        }

        .pq-final-mobile-card {
          padding: 9px;
        }
      }
    `}</style>
  )
}


export default ParentQuarterGradesPage