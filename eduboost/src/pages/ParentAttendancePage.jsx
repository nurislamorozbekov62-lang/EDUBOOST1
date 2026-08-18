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
  calculateSupabaseAttendanceStats,
  getSupabaseStudentAttendance,
} from '../services/supabaseAttendanceService'


const STATUS_FILTERS = [
  {
    value: 'all',
    label: 'Все',
  },
  {
    value: 'present',
    label: 'Был',
  },
  {
    value: 'absent',
    label: 'Пропуск',
  },
  {
    value: 'late',
    label: 'Опоздал',
  },
  {
    value: 'excused',
    label: 'Уваж.',
  },
]


function ParentAttendancePage() {
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
    records,
    setRecords,
  ] = useState([])

  const [
    loading,
    setLoading,
  ] = useState(true)

  const [
    error,
    setError,
  ] = useState('')

  const [
    statusFilter,
    setStatusFilter,
  ] = useState('all')


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
        'Parent sync error:',
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
          (item) =>
            String(
              item.id,
            ) ===
            String(
              selectedStudentId,
            ),
        ) || null,
      [
        students,
        selectedStudentId,
      ],
    )


  useEffect(() => {
    if (!student?.id) {
      setRecords([])
      setLoading(false)
      return
    }

    void loadAttendance()
  }, [
    student?.id,
  ])


  async function loadAttendance() {
    try {
      setLoading(true)
      setError('')

      const rows =
        await getSupabaseStudentAttendance(
          student.id,
        )

      setRecords(
        rows || [],
      )
    } catch (
      loadError
    ) {
      console.error(
        'Attendance load error:',
        loadError,
      )

      setRecords([])

      setError(
        loadError?.message ||
          'Не удалось загрузить посещаемость.',
      )
    } finally {
      setLoading(false)
    }
  }


  const stats =
    useMemo(
      () =>
        calculateSupabaseAttendanceStats(
          records,
        ),
      [
        records,
      ],
    )


  const filteredRecords =
    useMemo(
      () =>
        [...records]
          .filter(
            (record) =>
              statusFilter ===
                'all' ||
              record.status ===
                statusFilter,
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
        records,
        statusFilter,
      ],
    )


  const groupedRecords =
    useMemo(
      () => {
        const groups =
          new Map()

        filteredRecords.forEach(
          (
            record,
          ) => {
            const key =
              record.date ||
              'unknown'

            if (
              !groups.has(
                key,
              )
            ) {
              groups.set(
                key,
                [],
              )
            }

            groups
              .get(key)
              .push(
                record,
              )
          },
        )

        return [
          ...groups.entries(),
        ]
      },
      [
        filteredRecords,
      ],
    )


  if (
    user?.role !==
    'Родитель'
  ) {
    return (
      <>
        <AttendanceStyles />

        <div className="pa-page">
          <AttendanceEmpty
            icon={
              UserRound
            }
            title="Доступ запрещён"
            text="Раздел посещаемости доступен только родителю."
          />
        </div>
      </>
    )
  }


  if (!student) {
    return (
      <>
        <AttendanceStyles />

        <div className="pa-page">
          <AttendanceEmpty
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
      <AttendanceStyles />

      <div className="pa-page">

        <header className="pa-header">

          <div>

            <span>
              Учебный процесс
            </span>

            <h1>
              Посещаемость
            </h1>

            <p>
              Информация о посещении
              уроков, пропусках,
              опозданиях и уважительных
              причинах.
            </p>

          </div>


          <button
            type="button"
            onClick={
              loadAttendance
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


        <section className="pa-student">

          <div className="pa-avatar">
            {getInitials(
              student.name,
            )}
          </div>


          <div className="pa-student-main">

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


            <div className="pa-student-meta">

              <small>
                <School
                  size={14}
                />

                {student.school ||
                  'Школа не указана'}
              </small>


              <small>
                <UserRound
                  size={14}
                />

                {student.className ||
                  student.class_name ||
                  'Класс не указан'}
              </small>

            </div>

          </div>

        </section>


        <section className="pa-overview">

          <div className="pa-percent-card">

            <div className="pa-percent-top">

              <span>
                Посещаемость
              </span>

              <strong>
                {stats.percent ||
                  0}
                %
              </strong>

            </div>


            <div className="pa-progress">

              <span
                style={{
                  width:
                    `${Math.min(
                      100,
                      Number(
                        stats.percent ||
                          0,
                      ),
                    )}%`,
                }}
              />

            </div>


            <small>
              На основе всех
              отмеченных уроков
            </small>

          </div>


          <div className="pa-stat-grid">

            <AttendanceStat
              icon={
                CheckCircle2
              }
              type="present"
              value={
                stats.present ||
                0
              }
              label="Был"
            />


            <AttendanceStat
              icon={
                AlertTriangle
              }
              type="absent"
              value={
                stats.absent ||
                0
              }
              label="Пропуск"
            />


            <AttendanceStat
              icon={
                Clock3
              }
              type="late"
              value={
                stats.late ||
                0
              }
              label="Опоздал"
            />


            <AttendanceStat
              icon={
                CalendarDays
              }
              type="excused"
              value={
                stats.excused ||
                0
              }
              label="Уваж."
            />

          </div>

        </section>


        <section className="pa-filter-section">

          <div className="pa-section-heading">

            <div>

              <span>
                История
              </span>

              <h2>
                Посещение уроков
              </h2>

            </div>


            <small>
              {
                filteredRecords.length
              } записей
            </small>

          </div>


          <div className="pa-filters">

            {STATUS_FILTERS.map(
              (
                filter,
              ) => (
                <button
                  type="button"
                  key={
                    filter.value
                  }
                  onClick={() =>
                    setStatusFilter(
                      filter.value,
                    )
                  }
                  className={
                    statusFilter ===
                    filter.value
                      ? 'active'
                      : ''
                  }
                >
                  {
                    filter.label
                  }
                </button>
              ),
            )}

          </div>

        </section>


        {error && (
          <div className="pa-error">
            {error}
          </div>
        )}


        <section className="pa-history">

          {loading ? (
            <AttendanceEmpty
              icon={
                RefreshCcw
              }
              title="Загрузка"
              text="Получаем данные о посещаемости..."
            />
          ) : groupedRecords.length ===
            0 ? (
            <AttendanceEmpty
              icon={
                CalendarDays
              }
              title="Записей пока нет"
              text={
                statusFilter ===
                  'all'
                  ? 'Учитель пока не отметил посещаемость.'
                  : 'По выбранному статусу записей нет.'
              }
            />
          ) : (
            groupedRecords.map(
              (
                [
                  date,
                  dayRecords,
                ],
              ) => (
                <section
                  className="pa-day"
                  key={
                    date
                  }
                >

                  <div className="pa-day-header">

                    <div className="pa-day-icon">
                      <CalendarDays
                        size={17}
                      />
                    </div>


                    <div>

                      <strong>
                        {formatFullDate(
                          date,
                        )}
                      </strong>

                      <span>
                        {
                          dayRecords.length
                        }{' '}
                        {getLessonWord(
                          dayRecords.length,
                        )}
                      </span>

                    </div>

                  </div>


                  <div className="pa-day-list">

                    {dayRecords.map(
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

                </section>
              ),
            )
          )}

        </section>

      </div>
    </>
  )
}


function AttendanceStat({
  icon: Icon,
  type,
  value,
  label,
}) {
  return (
    <div
      className={`pa-stat ${type}`}
    >

      <Icon
        size={19}
      />

      <strong>
        {value}
      </strong>

      <span>
        {label}
      </span>

    </div>
  )
}


function AttendanceRecord({
  record,
}) {
  const status =
    getStatusInfo(
      record.status,
    )

  const Icon =
    status.icon

  return (
    <article className="pa-record">

      <div
        className={`pa-record-status ${record.status || ''}`}
      >
        <Icon
          size={18}
        />
      </div>


      <div className="pa-record-main">

        <strong>
          {record.subject ||
            'Предмет'}
        </strong>


        <span>
          {record.teacherName ||
            record.teacher_name
            ? `Учитель: ${
                record.teacherName ||
                record.teacher_name
              }`
            : 'Учитель не указан'}
        </span>


        {record.comment && (
          <p>
            {
              record.comment
            }
          </p>
        )}

      </div>


      <div
        className={`pa-status-badge ${record.status || ''}`}
      >
        {
          status.label
        }
      </div>

    </article>
  )
}


function AttendanceEmpty({
  icon: Icon,
  title,
  text,
}) {
  return (
    <div className="pa-empty">

      <div>
        <Icon
          size={24}
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


function getStatusInfo(
  status,
) {
  const statuses = {
    present: {
      label:
        'Был',
      icon:
        CheckCircle2,
    },

    absent: {
      label:
        'Пропуск',
      icon:
        AlertTriangle,
    },

    late: {
      label:
        'Опоздал',
      icon:
        Clock3,
    },

    excused: {
      label:
        'Уваж.',
      icon:
        CalendarDays,
    },
  }

  return (
    statuses[
      status
    ] || {
      label:
        'Не указано',
      icon:
        CalendarDays,
    }
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


function formatFullDate(
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
    return value
  }

  return date
    .toLocaleDateString(
      'ru-RU',
      {
        weekday:
          'long',

        day:
          'numeric',

        month:
          'long',

        year:
          'numeric',
      },
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
    ) % 100

  const last =
    value % 10

  if (
    value >= 11 &&
    value <= 19
  ) {
    return 'уроков'
  }

  if (last === 1) {
    return 'урок'
  }

  if (
    last >= 2 &&
    last <= 4
  ) {
    return 'урока'
  }

  return 'уроков'
}


function AttendanceStyles() {
  return (
    <style>{`
      .pa-page,
      .pa-page * {
        box-sizing: border-box;
      }

      .pa-page {
        width: min(
          920px,
          100%
        );
        display: grid;
        gap: 15px;
        margin: 0 auto;
        padding: 4px 0 34px;
        color: #334155;
      }

      .pa-header {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 14px;
      }

      .pa-header > div > span,
      .pa-section-heading
      > div > span {
        display: block;
        color: #94a3b8;
        font-size: 9px;
        font-weight: 900;
        letter-spacing: .07em;
        text-transform: uppercase;
      }

      .pa-header h1 {
        margin: 4px 0 0;
        color: #172554;
        font-size: 26px;
        line-height: 1.1;
      }

      .pa-header p {
        max-width: 480px;
        margin: 7px 0 0;
        color: #64748b;
        font-size: 11px;
        line-height: 1.5;
      }

      .pa-header > button {
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

      .pa-header > button:disabled {
        opacity: .5;
      }

      .pa-student {
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

      .pa-avatar {
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
        color: #ffffff;
        font-size: 13px;
        font-weight: 900;
      }

      .pa-student-main {
        flex: 1;
        min-width: 0;
      }

      .pa-student-main
      > span {
        display: block;
        margin-bottom: 2px;
        color: #94a3b8;
        font-size: 8px;
        font-weight: 900;
        text-transform: uppercase;
      }

      .pa-student-main
      > strong {
        display: block;
        color: #172554;
        font-size: 14px;
      }

      .pa-student-main select {
        width: 100%;
        max-width: 300px;
        padding: 0;
        border: 0;
        background: transparent;
        color: #172554;
        font: inherit;
        font-size: 14px;
        font-weight: 900;
        outline: 0;
      }

      .pa-student-meta {
        display: flex;
        flex-wrap: wrap;
        gap: 5px 12px;
        margin-top: 5px;
      }

      .pa-student-meta small {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        color: #64748b;
        font-size: 9px;
      }

      .pa-overview {
        display: grid;
        grid-template-columns:
          minmax(
            220px,
            .9fr
          )
          minmax(
            0,
            1.5fr
          );
        gap: 10px;
      }

      .pa-percent-card {
        padding: 15px;
        border: 1px solid #dbeafe;
        border-radius: 18px;
        background:
          linear-gradient(
            145deg,
            #eff6ff,
            #ffffff
          );
      }

      .pa-percent-top {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
      }

      .pa-percent-top span {
        color: #64748b;
        font-size: 10px;
        font-weight: 800;
      }

      .pa-percent-top strong {
        color: #2563eb;
        font-size: 25px;
      }

      .pa-progress {
        height: 8px;
        overflow: hidden;
        margin-top: 13px;
        border-radius: 999px;
        background: #dbeafe;
      }

      .pa-progress span {
        display: block;
        height: 100%;
        border-radius: inherit;
        background:
          linear-gradient(
            90deg,
            #2563eb,
            #60a5fa
          );
      }

      .pa-percent-card
      > small {
        display: block;
        margin-top: 8px;
        color: #94a3b8;
        font-size: 8px;
      }

      .pa-stat-grid {
        display: grid;
        grid-template-columns:
          repeat(
            4,
            minmax(
              0,
              1fr
            )
          );
        gap: 7px;
      }

      .pa-stat {
        min-width: 0;
        display: grid;
        place-items: center;
        align-content: center;
        padding: 12px 5px;
        border-radius: 16px;
        text-align: center;
      }

      .pa-stat strong {
        margin-top: 5px;
        font-size: 19px;
      }

      .pa-stat span {
        margin-top: 2px;
        font-size: 8px;
        font-weight: 800;
      }

      .pa-stat.present {
        background: #ecfdf5;
        color: #15803d;
      }

      .pa-stat.absent {
        background: #fef2f2;
        color: #b91c1c;
      }

      .pa-stat.late {
        background: #fff7ed;
        color: #b45309;
      }

      .pa-stat.excused {
        background: #eff6ff;
        color: #1d4ed8;
      }

      .pa-filter-section {
        padding: 14px;
        border: 1px solid #e5edf6;
        border-radius: 18px;
        background: #ffffff;
      }

      .pa-section-heading {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 10px;
      }

      .pa-section-heading h2 {
        margin: 3px 0 0;
        color: #172554;
        font-size: 17px;
      }

      .pa-section-heading
      > small {
        color: #64748b;
        font-size: 9px;
        font-weight: 800;
      }

      .pa-filters {
        display: flex;
        gap: 6px;
        overflow-x: auto;
        margin-top: 12px;
        padding-bottom: 2px;
        scrollbar-width: none;
      }

      .pa-filters::-webkit-scrollbar {
        display: none;
      }

      .pa-filters button {
        flex: 0 0 auto;
        min-height: 35px;
        padding: 0 13px;
        border: 1px solid #dbe5f0;
        border-radius: 10px;
        background: #ffffff;
        color: #64748b;
        font-size: 9px;
        font-weight: 900;
        cursor: pointer;
      }

      .pa-filters button.active {
        border-color: #2563eb;
        background: #2563eb;
        color: #ffffff;
      }

      .pa-history {
        display: grid;
        gap: 11px;
      }

      .pa-day {
        overflow: hidden;
        border: 1px solid #e5edf6;
        border-radius: 18px;
        background: #ffffff;
      }

      .pa-day-header {
        display: flex;
        align-items: center;
        gap: 9px;
        padding: 11px 13px;
        border-bottom: 1px solid #edf2f7;
        background: #f8fafc;
      }

      .pa-day-icon {
        width: 34px;
        height: 34px;
        flex: 0 0 34px;
        display: grid;
        place-items: center;
        border-radius: 10px;
        background: #eff6ff;
        color: #2563eb;
      }

      .pa-day-header strong,
      .pa-day-header span {
        display: block;
      }

      .pa-day-header strong {
        color: #172554;
        font-size: 11px;
        text-transform: capitalize;
      }

      .pa-day-header span {
        margin-top: 2px;
        color: #94a3b8;
        font-size: 8px;
      }

      .pa-day-list {
        display: grid;
      }

      .pa-record {
        display: flex;
        align-items: center;
        gap: 10px;
        min-width: 0;
        padding: 11px 13px;
        border-bottom: 1px solid #f1f5f9;
      }

      .pa-record:last-child {
        border-bottom: 0;
      }

      .pa-record-status {
        width: 38px;
        height: 38px;
        flex: 0 0 38px;
        display: grid;
        place-items: center;
        border-radius: 12px;
        background: #f1f5f9;
        color: #64748b;
      }

      .pa-record-status.present {
        background: #dcfce7;
        color: #15803d;
      }

      .pa-record-status.absent {
        background: #fee2e2;
        color: #b91c1c;
      }

      .pa-record-status.late {
        background: #ffedd5;
        color: #c2410c;
      }

      .pa-record-status.excused {
        background: #dbeafe;
        color: #1d4ed8;
      }

      .pa-record-main {
        flex: 1;
        min-width: 0;
      }

      .pa-record-main strong,
      .pa-record-main span {
        display: block;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .pa-record-main strong {
        color: #172554;
        font-size: 11px;
      }

      .pa-record-main span {
        margin-top: 2px;
        color: #64748b;
        font-size: 8px;
      }

      .pa-record-main p {
        margin: 6px 0 0;
        padding: 7px 8px;
        border-radius: 9px;
        background: #f8fafc;
        color: #475569;
        font-size: 8px;
        line-height: 1.45;
      }

      .pa-status-badge {
        flex: 0 0 auto;
        padding: 6px 8px;
        border-radius: 9px;
        background: #f1f5f9;
        color: #64748b;
        font-size: 8px;
        font-weight: 900;
      }

      .pa-status-badge.present {
        background: #dcfce7;
        color: #15803d;
      }

      .pa-status-badge.absent {
        background: #fee2e2;
        color: #b91c1c;
      }

      .pa-status-badge.late {
        background: #ffedd5;
        color: #c2410c;
      }

      .pa-status-badge.excused {
        background: #dbeafe;
        color: #1d4ed8;
      }

      .pa-error {
        padding: 10px 12px;
        border: 1px solid #fecaca;
        border-radius: 12px;
        background: #fef2f2;
        color: #b91c1c;
        font-size: 10px;
        font-weight: 800;
      }

      .pa-empty {
        display: flex;
        align-items: center;
        gap: 10px;
        min-height: 110px;
        padding: 15px;
        border: 1px dashed #dbe5f0;
        border-radius: 16px;
        background: #ffffff;
      }

      .pa-empty > div {
        width: 42px;
        height: 42px;
        flex: 0 0 42px;
        display: grid;
        place-items: center;
        border-radius: 13px;
        background: #eff6ff;
        color: #2563eb;
      }

      .pa-empty strong,
      .pa-empty small {
        display: block;
      }

      .pa-empty strong {
        color: #172554;
        font-size: 12px;
      }

      .pa-empty small {
        margin-top: 3px;
        color: #64748b;
        font-size: 9px;
        line-height: 1.45;
      }

      @media (
        max-width: 700px
      ) {
        .pa-overview {
          grid-template-columns:
            1fr;
        }
      }

      @media (
        max-width: 520px
      ) {
        .pa-page {
          gap: 12px;
          padding-bottom: 24px;
        }

        .pa-header h1 {
          font-size: 22px;
        }

        .pa-header p {
          font-size: 10px;
        }

        .pa-student {
          padding: 11px;
          border-radius: 16px;
        }

        .pa-avatar {
          width: 41px;
          height: 41px;
          flex-basis: 41px;
        }

        .pa-stat-grid {
          gap: 5px;
        }

        .pa-stat {
          padding: 10px 3px;
          border-radius: 13px;
        }

        .pa-stat strong {
          font-size: 16px;
        }

        .pa-stat span {
          font-size: 7px;
        }

        .pa-filter-section {
          padding: 12px;
          border-radius: 16px;
        }

        .pa-day {
          border-radius: 16px;
        }

        .pa-record {
          align-items: flex-start;
          padding: 10px;
        }

        .pa-record-status {
          width: 35px;
          height: 35px;
          flex-basis: 35px;
        }

        .pa-status-badge {
          padding: 5px 6px;
          font-size: 7px;
        }
      }
    `}</style>
  )
}


export default ParentAttendancePage