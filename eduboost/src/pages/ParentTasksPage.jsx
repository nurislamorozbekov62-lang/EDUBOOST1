import {
  useEffect,
  useMemo,
  useState,
} from 'react'

import {
  AlertTriangle,
  Award,
  BookOpenCheck,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock3,
  FileText,
  RefreshCcw,
  School,
  Send,
  UserRound,
} from 'lucide-react'

import {
  useAuth,
} from '../context/AuthContext'

import {
  ensureParentLinksSynced,
  getLinkedStudents,
  getStudentTasks,
} from '../services/parentService'

import {
  getStudentSubmission,
} from '../services/taskService'


const FILTERS = [
  {
    id: 'all',
    label: 'Все',
  },
  {
    id: 'active',
    label: 'Активные',
  },
  {
    id: 'pending',
    label: 'На проверке',
  },
  {
    id: 'overdue',
    label: 'Просроченные',
  },
  {
    id: 'completed',
    label: 'Выполненные',
  },
]


function ParentTasksPage() {
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
    tasks,
    setTasks,
  ] = useState([])

  const [
    selectedFilter,
    setSelectedFilter,
  ] = useState('all')

  const [
    expandedTasks,
    setExpandedTasks,
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
      setLoading(true)
      setError('')


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
    } catch (
      loadError
    ) {
      console.error(
        'Parent tasks students error:',
        loadError,
      )

      setError(
        loadError?.message ||
          'Не удалось загрузить данные ребёнка.',
      )
    } finally {
      setLoading(false)
    }
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
        ) || null,
      [
        students,
        selectedStudentId,
      ],
    )


  useEffect(() => {
    if (!student?.id) {
      setTasks([])
      return
    }

    loadTasks()
  }, [
    student?.id,
  ])


  function loadTasks() {
    if (!student) {
      setTasks([])
      return
    }


    try {
      setLoading(true)
      setError('')


      const studentTasks =
        getStudentTasks(
          student,
        ) || []


      setTasks(
        studentTasks,
      )
    } catch (
      loadError
    ) {
      console.error(
        'Parent tasks load error:',
        loadError,
      )

      setTasks([])

      setError(
        loadError?.message ||
          'Не удалось загрузить задания.',
      )
    } finally {
      setLoading(false)
    }
  }


  function refreshPage() {
    void loadStudents()

    if (student) {
      loadTasks()
    }
  }


  function getTaskInfo(
    task,
  ) {
    const submission =
      getStudentSubmission(
        task.id,
        student.id,
      )


    const status =
      submission?.status ||
      'new'


    const overdue =
      isTaskOverdue(
        task,
        status,
      )


    return {
      submission,
      status,
      overdue,

      teacherComment:
        submission?.teacherComment ||
        '',

      reportText:
        submission?.reportText ||
        '',
    }
  }


  const taskRows =
    useMemo(
      () =>
        tasks.map(
          (
            task,
          ) => {
            const info =
              student
                ? getTaskInfo(
                    task,
                  )
                : {
                    status:
                      'new',
                    overdue:
                      false,
                    submission:
                      null,
                    teacherComment:
                      '',
                    reportText:
                      '',
                  }


            return {
              ...task,
              taskInfo:
                info,
            }
          },
        ),
      [
        tasks,
        student?.id,
      ],
    )


  const counters =
    useMemo(
      () => {
        const result = {
          all:
            taskRows.length,

          active:
            0,

          pending:
            0,

          overdue:
            0,

          completed:
            0,
        }


        taskRows.forEach(
          (
            task,
          ) => {
            const {
              status,
              overdue,
            } =
              task.taskInfo


            if (
              status ===
              'approved'
            ) {
              result.completed +=
                1

              return
            }


            if (
              status ===
              'pending'
            ) {
              result.pending +=
                1
            }


            if (
              overdue
            ) {
              result.overdue +=
                1
            }


            if (
              !overdue &&
              status !==
                'approved'
            ) {
              result.active +=
                1
            }
          },
        )


        return result
      },
      [
        taskRows,
      ],
    )


  const visibleTasks =
    useMemo(
      () => {
        const filtered =
          taskRows.filter(
            (
              task,
            ) => {
              const {
                status,
                overdue,
              } =
                task.taskInfo


              if (
                selectedFilter ===
                'all'
              ) {
                return true
              }


              if (
                selectedFilter ===
                'completed'
              ) {
                return (
                  status ===
                  'approved'
                )
              }


              if (
                selectedFilter ===
                'pending'
              ) {
                return (
                  status ===
                  'pending'
                )
              }


              if (
                selectedFilter ===
                'overdue'
              ) {
                return overdue
              }


              if (
                selectedFilter ===
                'active'
              ) {
                return (
                  status !==
                    'approved' &&
                  !overdue
                )
              }


              return true
            },
          )


        return filtered.sort(
          (
            first,
            second,
          ) => {
            const firstTime =
              getDeadlineTime(
                first.deadline,
              )

            const secondTime =
              getDeadlineTime(
                second.deadline,
              )


            if (
              firstTime === 0 &&
              secondTime ===
                0
            ) {
              return 0
            }


            if (
              firstTime ===
              0
            ) {
              return 1
            }


            if (
              secondTime ===
              0
            ) {
              return -1
            }


            return (
              firstTime -
              secondTime
            )
          },
        )
      },
      [
        taskRows,
        selectedFilter,
      ],
    )


  function toggleTask(
    taskId,
  ) {
    setExpandedTasks(
      (
        current,
      ) => ({
        ...current,

        [taskId]:
          !current[
            taskId
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
        <ParentTasksStyles />

        <div className="pt-page">

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


  if (
    !student &&
    !loading
  ) {
    return (
      <>
        <ParentTasksStyles />

        <div className="pt-page">

          <EmptyState
            icon={
              UserRound
            }
            title="Ребёнок не привязан"
            text="Сначала добавьте ребёнка в родительском кабинете."
          />

        </div>
      </>
    )
  }


  return (
    <>
      <ParentTasksStyles />


      <div className="pt-page">

        <header className="pt-header">

          <div>

            <span>
              Учебный процесс
            </span>

            <h1>
              Задания
            </h1>

            <p>
              Следите за домашними
              заданиями ребёнка,
              сроками выполнения
              и результатами проверки.
            </p>

          </div>


          <button
            type="button"
            className="pt-refresh"
            onClick={
              refreshPage
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


        {student && (
          <section className="pt-student">

            <div className="pt-avatar">
              {getInitials(
                student.name,
              )}
            </div>


            <div className="pt-student-main">

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
                  ) => {
                    setSelectedStudentId(
                      event.target
                        .value,
                    )

                    setSelectedFilter(
                      'all',
                    )

                    setExpandedTasks(
                      {},
                    )
                  }}
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


              <div className="pt-student-meta">

                <small>

                  <School
                    size={13}
                  />

                  {student.school ||
                    'Школа не указана'}

                </small>


                <small>

                  <UserRound
                    size={13}
                  />

                  {student.className ||
                    student.class_name ||
                    'Класс не указан'}

                </small>

              </div>

            </div>

          </section>
        )}


        {error && (
          <div className="pt-error">
            {error}
          </div>
        )}


        {student && (
          <>
            <section className="pt-summary">

              <SummaryCard
                type="all"
                icon={
                  BookOpenCheck
                }
                value={
                  counters.all
                }
                label="Всего"
              />


              <SummaryCard
                type="active"
                icon={
                  Clock3
                }
                value={
                  counters.active
                }
                label="Активные"
              />


              <SummaryCard
                type="overdue"
                icon={
                  AlertTriangle
                }
                value={
                  counters.overdue
                }
                label="Просрочено"
              />


              <SummaryCard
                type="completed"
                icon={
                  CheckCircle2
                }
                value={
                  counters.completed
                }
                label="Выполнено"
              />

            </section>


            {counters.overdue >
              0 && (
              <button
                type="button"
                className="pt-overdue-alert"
                onClick={() =>
                  setSelectedFilter(
                    'overdue',
                  )
                }
              >

                <AlertTriangle
                  size={20}
                />


                <span>

                  <strong>
                    Есть просроченные
                    задания
                  </strong>

                  <small>
                    Требуют внимания:{' '}
                    {
                      counters.overdue
                    }
                  </small>

                </span>


                <ChevronRight
                  size={18}
                />

              </button>
            )}


            <section className="pt-filter-section">

              <div className="pt-section-heading">

                <div>

                  <span>
                    Задания ребёнка
                  </span>

                  <h2>
                    Список работ
                  </h2>

                </div>


                <small>
                  {
                    visibleTasks.length
                  }{' '}
                  {getTaskWord(
                    visibleTasks.length,
                  )}
                </small>

              </div>


              <div className="pt-filters">

                {FILTERS.map(
                  (
                    filter,
                  ) => (
                    <button
                      type="button"
                      key={
                        filter.id
                      }
                      className={
                        selectedFilter ===
                        filter.id
                          ? 'active'
                          : ''
                      }
                      onClick={() =>
                        setSelectedFilter(
                          filter.id,
                        )
                      }
                    >

                      <span>
                        {
                          filter.label
                        }
                      </span>


                      <small>
                        {
                          counters[
                            filter.id
                          ] ||
                          0
                        }
                      </small>

                    </button>
                  ),
                )}

              </div>

            </section>


            <section className="pt-task-list">

              {loading ? (
                <EmptyState
                  icon={
                    RefreshCcw
                  }
                  title="Загрузка"
                  text="Получаем задания ребёнка."
                />
              ) : visibleTasks.length ===
                0 ? (
                <EmptyState
                  icon={
                    BookOpenCheck
                  }
                  title={getEmptyTitle(
                    selectedFilter,
                  )}
                  text={getEmptyText(
                    selectedFilter,
                  )}
                />
              ) : (
                visibleTasks.map(
                  (
                    task,
                  ) => (
                    <ParentTaskCard
                      key={
                        task.id
                      }
                      task={
                        task
                      }
                      expanded={
                        Boolean(
                          expandedTasks[
                            task.id
                          ],
                        )
                      }
                      toggle={() =>
                        toggleTask(
                          task.id,
                        )
                      }
                    />
                  ),
                )
              )}

            </section>

          </>
        )}

      </div>
    </>
  )
}


function ParentTaskCard({
  task,
  expanded,
  toggle,
}) {
  const {
    status,
    overdue,
    teacherComment,
    reportText,
  } =
    task.taskInfo


  const statusInfo =
    getStatusInfo(
      status,
      overdue,
    )


  const StatusIcon =
    statusInfo.icon


  return (
    <article
      className={`pt-task ${
        overdue
          ? 'overdue'
          : ''
      }`}
    >

      <button
        type="button"
        className="pt-task-main-button"
        onClick={
          toggle
        }
      >

        <div
          className={`pt-task-icon ${statusInfo.className}`}
        >
          <StatusIcon
            size={19}
          />
        </div>


        <div className="pt-task-main">

          <div className="pt-task-topline">

            <span>
              {task.subject ||
                'Предмет'}
            </span>


            <StatusBadge
              status={
                status
              }
              overdue={
                overdue
              }
            />

          </div>


          <h3>
            {task.title ||
              'Задание'}
          </h3>


          {task.description && (
            <p>
              {
                task.description
              }
            </p>
          )}


          <div className="pt-task-meta">

            <span
              className={
                overdue
                  ? 'deadline overdue'
                  : 'deadline'
              }
            >

              <CalendarDays
                size={14}
              />

              {task.deadline
                ? `До ${formatTaskDate(
                    task.deadline,
                  )}`
                : 'Без срока'}

            </span>


            <span>

              <Award
                size={14}
              />

              {Number(
                task.reward ||
                  0,
              )}{' '}
              баллов

            </span>

          </div>

        </div>


        {expanded ? (
          <ChevronDown
            className="pt-chevron"
            size={19}
          />
        ) : (
          <ChevronRight
            className="pt-chevron"
            size={19}
          />
        )}

      </button>


      {expanded && (
        <div className="pt-task-details">

          <div className="pt-detail-grid">

            <DetailItem
              icon={
                CalendarDays
              }
              label="Срок"
              value={
                task.deadline
                  ? formatTaskDate(
                      task.deadline,
                    )
                  : 'Не указан'
              }
              danger={
                overdue
              }
            />


            <DetailItem
              icon={
                Award
              }
              label="Награда"
              value={`${Number(
                task.reward ||
                  0,
              )} баллов`}
            />


            <DetailItem
              icon={
                StatusIcon
              }
              label="Статус"
              value={
                statusInfo.label
              }
              statusClass={
                statusInfo.className
              }
            />

          </div>


          {task.description && (
            <section className="pt-detail-section">

              <div className="pt-detail-title">

                <FileText
                  size={16}
                />

                <strong>
                  Что нужно сделать
                </strong>

              </div>


              <p>
                {
                  task.description
                }
              </p>

            </section>
          )}


          {reportText && (
            <section className="pt-detail-section report">

              <div className="pt-detail-title">

                <Send
                  size={16}
                />

                <strong>
                  Ответ ребёнка
                </strong>

              </div>


              <p>
                {
                  reportText
                }
              </p>

            </section>
          )}


          {teacherComment && (
            <section className="pt-teacher-comment">

              <div>

                <GraduationIcon />

                <strong>
                  Комментарий учителя
                </strong>

              </div>


              <p>
                {
                  teacherComment
                }
              </p>

            </section>
          )}


          {!reportText &&
            status ===
              'new' && (
            <div className="pt-parent-note">

              <UserRound
                size={16}
              />

              <span>
                Ребёнок ещё не отправил
                эту работу на проверку.
              </span>

            </div>
          )}


          {status ===
            'pending' && (
            <div className="pt-parent-note pending">

              <Clock3
                size={16}
              />

              <span>
                Работа отправлена.
                Ожидается проверка
                учителя.
              </span>

            </div>
          )}


          {status ===
            'approved' && (
            <div className="pt-parent-note approved">

              <CheckCircle2
                size={16}
              />

              <span>
                Работа проверена
                и принята учителем.
              </span>

            </div>
          )}


          {status ===
            'rejected' && (
            <div className="pt-parent-note rejected">

              <AlertTriangle
                size={16}
              />

              <span>
                Учитель попросил
                исправить работу.
              </span>

            </div>
          )}

        </div>
      )}

    </article>
  )
}


function GraduationIcon() {
  return (
    <div className="pt-teacher-icon">
      <UserRound
        size={15}
      />
    </div>
  )
}


function SummaryCard({
  type,
  icon: Icon,
  value,
  label,
}) {
  return (
    <div
      className={`pt-summary-card ${type}`}
    >

      <div>
        <Icon
          size={18}
        />
      </div>


      <strong>
        {value}
      </strong>

      <span>
        {label}
      </span>

    </div>
  )
}


function DetailItem({
  icon: Icon,
  label,
  value,
  danger = false,
  statusClass = '',
}) {
  return (
    <div
      className={`pt-detail-item ${
        danger
          ? 'danger'
          : ''
      } ${
        statusClass
      }`}
    >

      <Icon
        size={17}
      />


      <span>

        <small>
          {label}
        </small>

        <strong>
          {value}
        </strong>

      </span>

    </div>
  )
}


function StatusBadge({
  status,
  overdue,
}) {
  const info =
    getStatusInfo(
      status,
      overdue,
    )


  return (
    <span
      className={`pt-status ${info.className}`}
    >
      {
        info.label
      }
    </span>
  )
}


function EmptyState({
  icon: Icon,
  title,
  text,
}) {
  return (
    <div className="pt-empty">

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
  overdue,
) {
  if (
    overdue &&
    status !==
      'approved'
  ) {
    return {
      label:
        'Просрочено',

      className:
        'overdue',

      icon:
        AlertTriangle,
    }
  }


  const statuses = {
    new: {
      label:
        'Не выполнено',

      className:
        'new',

      icon:
        Clock3,
    },

    pending: {
      label:
        'На проверке',

      className:
        'pending',

      icon:
        Send,
    },

    approved: {
      label:
        'Принято',

      className:
        'approved',

      icon:
        CheckCircle2,
    },

    rejected: {
      label:
        'Нужно исправить',

      className:
        'rejected',

      icon:
        AlertTriangle,
    },
  }


  return (
    statuses[
      status
    ] ||
    statuses.new
  )
}


function isTaskOverdue(
  task,
  status,
) {
  if (
    status ===
    'approved'
  ) {
    return false
  }


  if (!task?.deadline) {
    return false
  }


  const deadline =
    new Date(
      `${task.deadline}T23:59:59`,
    )


  if (
    Number.isNaN(
      deadline.getTime(),
    )
  ) {
    return false
  }


  return (
    deadline.getTime() <
    Date.now()
  )
}


function getDeadlineTime(
  value,
) {
  if (!value) {
    return 0
  }


  const date =
    new Date(
      `${value}T23:59:59`,
    )


  return Number.isNaN(
    date.getTime(),
  )
    ? 0
    : date.getTime()
}


function formatTaskDate(
  value,
) {
  if (!value) {
    return 'Не указан'
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
        'numeric',

      month:
        'long',

      year:
        'numeric',
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


function getTaskWord(
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
    return 'заданий'
  }


  if (
    last === 1
  ) {
    return 'задание'
  }


  if (
    last >= 2 &&
    last <= 4
  ) {
    return 'задания'
  }


  return 'заданий'
}


function getEmptyTitle(
  filter,
) {
  const titles = {
    active:
      'Активных заданий нет',

    pending:
      'Нет работ на проверке',

    overdue:
      'Просроченных заданий нет',

    completed:
      'Выполненных заданий пока нет',
  }


  return (
    titles[
      filter
    ] ||
    'Заданий пока нет'
  )
}


function getEmptyText(
  filter,
) {
  const texts = {
    active:
      'На данный момент у ребёнка нет активных заданий.',

    pending:
      'Ребёнок пока не отправлял работы, ожидающие проверки.',

    overdue:
      'Отлично — просроченных заданий нет.',

    completed:
      'Принятые учителем работы появятся здесь.',
  }


  return (
    texts[
      filter
    ] ||
    'Новые задания учителя появятся здесь.'
  )
}


function ParentTasksStyles() {
  return (
    <style>{`
      .pt-page,
      .pt-page * {
        box-sizing: border-box;
      }

      .pt-page {
        width: min(
          940px,
          100%
        );
        display: grid;
        gap: 14px;
        margin: 0 auto;
        padding-bottom: 34px;
        color: #334155;
      }

      .pt-header {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 14px;
      }

      .pt-header > div > span,
      .pt-section-heading
      > div > span {
        display: block;
        color: #94a3b8;
        font-size: 9px;
        font-weight: 900;
        letter-spacing: .07em;
        text-transform: uppercase;
      }

      .pt-header h1 {
        margin: 4px 0 0;
        color: #172554;
        font-size: 26px;
        line-height: 1.1;
      }

      .pt-header p {
        max-width: 500px;
        margin: 7px 0 0;
        color: #64748b;
        font-size: 11px;
        line-height: 1.5;
      }

      .pt-refresh {
        width: 42px;
        height: 42px;
        flex: 0 0 42px;
        display: grid;
        place-items: center;
        padding: 0;
        border:
          1px solid
          #dbe5f0;
        border-radius: 13px;
        background: #ffffff;
        color: #2563eb;
        cursor: pointer;
      }

      .pt-refresh:disabled {
        opacity: .5;
      }

      .pt-student {
        display: flex;
        align-items: center;
        gap: 11px;
        padding: 13px;
        border:
          1px solid
          #dbeafe;
        border-radius: 18px;
        background:
          linear-gradient(
            135deg,
            #eff6ff,
            #ffffff
          );
      }

      .pt-avatar {
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

      .pt-student-main {
        flex: 1;
        min-width: 0;
      }

      .pt-student-main > span {
        display: block;
        color: #94a3b8;
        font-size: 8px;
        font-weight: 900;
        text-transform: uppercase;
      }

      .pt-student-main > strong {
        display: block;
        margin-top: 2px;
        color: #172554;
        font-size: 14px;
      }

      .pt-student-main select {
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

      .pt-student-meta {
        display: flex;
        flex-wrap: wrap;
        gap: 5px 12px;
        margin-top: 5px;
      }

      .pt-student-meta small {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        color: #64748b;
        font-size: 9px;
      }

      .pt-summary {
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

      .pt-summary-card {
        min-width: 0;
        display: grid;
        place-items: center;
        padding: 11px 5px;
        border:
          1px solid
          #e5edf6;
        border-radius: 15px;
        background: #ffffff;
        text-align: center;
      }

      .pt-summary-card > div {
        width: 32px;
        height: 32px;
        display: grid;
        place-items: center;
        border-radius: 10px;
        background: #f1f5f9;
        color: #64748b;
      }

      .pt-summary-card strong {
        margin-top: 5px;
        color: #172554;
        font-size: 17px;
      }

      .pt-summary-card span {
        margin-top: 2px;
        color: #94a3b8;
        font-size: 7px;
        font-weight: 800;
      }

      .pt-summary-card.active
      > div {
        background: #eff6ff;
        color: #2563eb;
      }

      .pt-summary-card.overdue
      > div {
        background: #fef2f2;
        color: #dc2626;
      }

      .pt-summary-card.completed
      > div {
        background: #ecfdf5;
        color: #15803d;
      }

      .pt-overdue-alert {
        width: 100%;
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 12px;
        border:
          1px solid
          #fed7aa;
        border-radius: 15px;
        background: #fff7ed;
        color: #c2410c;
        text-align: left;
        cursor: pointer;
      }

      .pt-overdue-alert
      > span {
        flex: 1;
      }

      .pt-overdue-alert strong,
      .pt-overdue-alert small {
        display: block;
      }

      .pt-overdue-alert strong {
        font-size: 10px;
      }

      .pt-overdue-alert small {
        margin-top: 2px;
        font-size: 8px;
      }

      .pt-filter-section {
        padding: 13px;
        border:
          1px solid
          #e5edf6;
        border-radius: 17px;
        background: #ffffff;
      }

      .pt-section-heading {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 10px;
      }

      .pt-section-heading h2 {
        margin: 3px 0 0;
        color: #172554;
        font-size: 17px;
      }

      .pt-section-heading
      > small {
        color: #64748b;
        font-size: 8px;
        font-weight: 800;
      }

      .pt-filters {
        display: flex;
        gap: 6px;
        overflow-x: auto;
        margin-top: 11px;
        padding-bottom: 2px;
        scrollbar-width: none;
      }

      .pt-filters::-webkit-scrollbar {
        display: none;
      }

      .pt-filters button {
        flex: 0 0 auto;
        display: flex;
        align-items: center;
        gap: 5px;
        min-height: 35px;
        padding: 0 10px;
        border:
          1px solid
          #dbe5f0;
        border-radius: 10px;
        background: #ffffff;
        color: #64748b;
        font-size: 8px;
        font-weight: 900;
        cursor: pointer;
      }

      .pt-filters button small {
        min-width: 18px;
        height: 18px;
        display: grid;
        place-items: center;
        border-radius: 6px;
        background: #f1f5f9;
        font-size: 7px;
      }

      .pt-filters button.active {
        border-color: #2563eb;
        background: #2563eb;
        color: #ffffff;
      }

      .pt-filters
      button.active
      small {
        background:
          rgba(
            255,
            255,
            255,
            .18
          );
        color: #ffffff;
      }

      .pt-task-list {
        display: grid;
        gap: 9px;
      }

      .pt-task {
        overflow: hidden;
        border:
          1px solid
          #e5edf6;
        border-radius: 17px;
        background: #ffffff;
      }

      .pt-task.overdue {
        border-color: #fecaca;
      }

      .pt-task-main-button {
        width: 100%;
        display: flex;
        align-items: flex-start;
        gap: 10px;
        padding: 12px;
        border: 0;
        background: transparent;
        color: inherit;
        text-align: left;
        cursor: pointer;
      }

      .pt-task-icon {
        width: 40px;
        height: 40px;
        flex: 0 0 40px;
        display: grid;
        place-items: center;
        border-radius: 12px;
        background: #f1f5f9;
        color: #64748b;
      }

      .pt-task-icon.new {
        background: #eff6ff;
        color: #2563eb;
      }

      .pt-task-icon.pending {
        background: #eef2ff;
        color: #4f46e5;
      }

      .pt-task-icon.approved {
        background: #ecfdf5;
        color: #15803d;
      }

      .pt-task-icon.rejected,
      .pt-task-icon.overdue {
        background: #fef2f2;
        color: #dc2626;
      }

      .pt-task-main {
        flex: 1;
        min-width: 0;
      }

      .pt-task-topline {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 7px;
      }

      .pt-task-topline
      > span:first-child {
        overflow: hidden;
        color: #2563eb;
        font-size: 8px;
        font-weight: 900;
        text-overflow: ellipsis;
        text-transform: uppercase;
        white-space: nowrap;
      }

      .pt-task-main h3 {
        margin: 4px 0 0;
        color: #172554;
        font-size: 13px;
        line-height: 1.25;
      }

      .pt-task-main > p {
        display: -webkit-box;
        overflow: hidden;
        margin: 4px 0 0;
        color: #64748b;
        font-size: 9px;
        line-height: 1.4;
        -webkit-box-orient: vertical;
        -webkit-line-clamp: 2;
      }

      .pt-task-meta {
        display: flex;
        flex-wrap: wrap;
        gap: 5px 12px;
        margin-top: 8px;
      }

      .pt-task-meta span {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        color: #64748b;
        font-size: 8px;
      }

      .pt-task-meta
      .deadline.overdue {
        color: #dc2626;
        font-weight: 900;
      }

      .pt-status {
        flex: 0 0 auto;
        padding: 5px 7px;
        border-radius: 8px;
        background: #f1f5f9;
        color: #64748b;
        font-size: 7px;
        font-weight: 900;
        white-space: nowrap;
      }

      .pt-status.new {
        background: #eff6ff;
        color: #2563eb;
      }

      .pt-status.pending {
        background: #eef2ff;
        color: #4f46e5;
      }

      .pt-status.approved {
        background: #dcfce7;
        color: #15803d;
      }

      .pt-status.rejected,
      .pt-status.overdue {
        background: #fee2e2;
        color: #b91c1c;
      }

      .pt-chevron {
        flex: 0 0 auto;
        margin-top: 11px;
        color: #94a3b8;
      }

      .pt-task-details {
        display: grid;
        gap: 10px;
        padding:
          11px 12px 12px;
        border-top:
          1px solid
          #edf2f7;
        background: #fbfdff;
      }

      .pt-detail-grid {
        display: grid;
        grid-template-columns:
          repeat(
            3,
            minmax(
              0,
              1fr
            )
          );
        gap: 6px;
      }

      .pt-detail-item {
        display: flex;
        align-items: center;
        gap: 7px;
        min-width: 0;
        padding: 8px;
        border-radius: 11px;
        background: #ffffff;
        color: #64748b;
      }

      .pt-detail-item
      > span {
        min-width: 0;
      }

      .pt-detail-item small,
      .pt-detail-item strong {
        display: block;
      }

      .pt-detail-item small {
        color: #94a3b8;
        font-size: 6px;
      }

      .pt-detail-item strong {
        overflow: hidden;
        margin-top: 2px;
        color: #172554;
        font-size: 8px;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .pt-detail-item.danger {
        color: #dc2626;
      }

      .pt-detail-item.danger
      strong {
        color: #b91c1c;
      }

      .pt-detail-item.approved {
        color: #15803d;
      }

      .pt-detail-item.pending {
        color: #4f46e5;
      }

      .pt-detail-item.rejected,
      .pt-detail-item.overdue {
        color: #dc2626;
      }

      .pt-detail-section {
        padding: 10px;
        border-radius: 12px;
        background: #ffffff;
      }

      .pt-detail-section.report {
        background: #eff6ff;
      }

      .pt-detail-title {
        display: flex;
        align-items: center;
        gap: 6px;
        color: #2563eb;
      }

      .pt-detail-title strong {
        color: #172554;
        font-size: 9px;
      }

      .pt-detail-section p {
        margin: 7px 0 0;
        color: #475569;
        font-size: 9px;
        line-height: 1.5;
        white-space: pre-wrap;
      }

      .pt-teacher-comment {
        padding: 10px;
        border:
          1px solid
          #c7d2fe;
        border-radius: 12px;
        background: #eef2ff;
      }

      .pt-teacher-comment
      > div {
        display: flex;
        align-items: center;
        gap: 6px;
      }

      .pt-teacher-comment strong {
        color: #3730a3;
        font-size: 9px;
      }

      .pt-teacher-comment p {
        margin: 7px 0 0;
        color: #475569;
        font-size: 9px;
        line-height: 1.5;
        white-space: pre-wrap;
      }

      .pt-teacher-icon {
        width: 26px;
        height: 26px;
        display: grid;
        place-items: center;
        border-radius: 8px;
        background: #ffffff;
        color: #4f46e5;
      }

      .pt-parent-note {
        display: flex;
        align-items: center;
        gap: 7px;
        padding: 9px;
        border-radius: 11px;
        background: #f1f5f9;
        color: #64748b;
        font-size: 8px;
        line-height: 1.4;
      }

      .pt-parent-note.pending {
        background: #eef2ff;
        color: #4338ca;
      }

      .pt-parent-note.approved {
        background: #ecfdf5;
        color: #15803d;
      }

      .pt-parent-note.rejected {
        background: #fef2f2;
        color: #b91c1c;
      }

      .pt-error {
        padding: 10px 12px;
        border:
          1px solid
          #fecaca;
        border-radius: 12px;
        background: #fef2f2;
        color: #b91c1c;
        font-size: 9px;
        font-weight: 800;
      }

      .pt-empty {
        display: flex;
        align-items: center;
        gap: 10px;
        min-height: 110px;
        padding: 14px;
        border:
          1px dashed
          #dbe5f0;
        border-radius: 16px;
        background: #ffffff;
      }

      .pt-empty > div {
        width: 42px;
        height: 42px;
        flex: 0 0 42px;
        display: grid;
        place-items: center;
        border-radius: 13px;
        background: #eff6ff;
        color: #2563eb;
      }

      .pt-empty strong,
      .pt-empty small {
        display: block;
      }

      .pt-empty strong {
        color: #172554;
        font-size: 11px;
      }

      .pt-empty small {
        margin-top: 3px;
        color: #64748b;
        font-size: 8px;
        line-height: 1.45;
      }

      @media (
        max-width: 620px
      ) {
        .pt-detail-grid {
          grid-template-columns:
            1fr;
        }
      }

      @media (
        max-width: 520px
      ) {
        .pt-page {
          gap: 12px;
          padding-bottom: 24px;
        }

        .pt-header h1 {
          font-size: 22px;
        }

        .pt-header p {
          font-size: 10px;
        }

        .pt-student {
          padding: 11px;
          border-radius: 16px;
        }

        .pt-avatar {
          width: 42px;
          height: 42px;
          flex-basis: 42px;
        }

        .pt-summary {
          gap: 5px;
        }

        .pt-summary-card {
          padding: 9px 3px;
          border-radius: 12px;
        }

        .pt-summary-card
        > div {
          width: 29px;
          height: 29px;
        }

        .pt-summary-card
        strong {
          font-size: 15px;
        }

        .pt-summary-card
        span {
          font-size: 6px;
        }

        .pt-filter-section {
          padding: 11px;
          border-radius: 15px;
        }

        .pt-task {
          border-radius: 15px;
        }

        .pt-task-main-button {
          gap: 8px;
          padding: 10px;
        }

        .pt-task-icon {
          width: 36px;
          height: 36px;
          flex-basis: 36px;
        }

        .pt-task-main h3 {
          font-size: 11px;
        }

        .pt-status {
          padding: 4px 6px;
          font-size: 6px;
        }

        .pt-task-meta {
          gap: 4px 8px;
        }

        .pt-task-meta span {
          font-size: 7px;
        }

        .pt-chevron {
          margin-top: 9px;
        }
      }
    `}</style>
  )
}


export default ParentTasksPage