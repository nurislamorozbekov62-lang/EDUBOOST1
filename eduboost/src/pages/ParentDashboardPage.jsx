import {
  useEffect,
  useMemo,
  useState,
} from 'react'

import {
  Link,
} from 'react-router-dom'

import {
  AlertTriangle,
  Award,
  BarChart3,
  Bell,
  BookOpenCheck,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Coins,
  Gift,
  GraduationCap,
  Home,
  Link2,
  Menu,
  RefreshCcw,
  School,
  Sparkles,
  Trash2,
  UserRound,
  X,
} from 'lucide-react'

import {
  useAuth,
} from '../context/AuthContext'

import {
  useAutoRefresh,
} from '../hooks/useAutoRefresh'

import {
  getLevelByXp,
} from '../data/levels'

import {
  getUnlockedAchievements,
} from '../data/achievements'

import {
  claimParentReward,
  createParentReward,
  ensureParentLinksSynced,
  getLinkedStudents,
  getOverdueTasks,
  getParentRewards,
  getStudentTasks,
  linkParentToStudent,
  removeParentLink,
} from '../services/parentService'

import {
  getSupabaseStudentGrades,
} from '../services/supabaseJournalService'

import {
  calculateSupabaseAttendanceStats,
  getSupabaseStudentAttendance,
} from '../services/supabaseAttendanceService'


function ParentDashboardPage() {
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
    studentCode,
    setStudentCode,
  ] = useState('')

  const [
    pageError,
    setPageError,
  ] = useState('')

  const [
    refreshKey,
    setRefreshKey,
  ] = useState(0)

  const [
    grades,
    setGrades,
  ] = useState([])

  const [
    attendanceRecords,
    setAttendanceRecords,
  ] = useState([])

  const [
    academicLoading,
    setAcademicLoading,
  ] = useState(false)

  const [
    academicError,
    setAcademicError,
  ] = useState('')

  const [
    menuOpen,
    setMenuOpen,
  ] = useState(false)

  const [
    rewardsOpen,
    setRewardsOpen,
  ] = useState(false)

  const [
    rewardForm,
    setRewardForm,
  ] = useState({
    title: '',
    description: '',
    requiredPoints: 500,
  })

  const [
    selectedDay,
    setSelectedDay,
  ] = useState(
    new Date()
      .toISOString()
      .slice(0, 10),
  )


  useEffect(() => {
    if (!user?.id) {
      return
    }

    loadStudents()
  }, [
    user?.id,
    refreshKey,
  ])


  function loadStudents() {
    if (!user?.id) {
      return
    }

    const linkedStudents =
      getLinkedStudents(
        user.id,
      ) || []

    setStudents(
      linkedStudents,
    )

    setSelectedStudentId(
      (currentId) => {
        const stillExists =
          linkedStudents.some(
            (student) =>
              String(
                student.id,
              ) ===
              String(
                currentId,
              ),
          )

        if (
          currentId &&
          stillExists
        ) {
          return currentId
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
    if (
      !user?.id ||
      !student?.id
    ) {
      setGrades([])
      setAttendanceRecords([])
      setAcademicError('')
      setAcademicLoading(false)

      return
    }

    void loadAcademicData(
      student.id,
    )
  }, [
    user?.id,
    student?.id,
    refreshKey,
  ])


  useAutoRefresh(
    async () => {
      if (
        user?.id &&
        student?.id
      ) {
        await loadAcademicData(
          student.id,
        )
      }
    },
    [
      user?.id,
      student?.id,
    ],
  )


  async function loadAcademicData(
    studentId,
  ) {
    if (
      !user?.id ||
      !studentId
    ) {
      return
    }

    try {
      setAcademicLoading(true)
      setAcademicError('')

      await ensureParentLinksSynced(
        user.id,
      )

      const [
        gradeRows,
        attendanceRows,
      ] = await Promise.all([
        getSupabaseStudentGrades(
          studentId,
        ),

        getSupabaseStudentAttendance(
          studentId,
        ),
      ])

      setGrades(
        gradeRows || [],
      )

      setAttendanceRecords(
        attendanceRows || [],
      )
    } catch (
      error
    ) {
      console.error(
        'Parent academic load error:',
        error,
      )

      setAcademicError(
        error?.message ||
          'Не удалось загрузить данные ребёнка.',
      )
    } finally {
      setAcademicLoading(false)
    }
  }


  function refreshDashboard() {
    setRefreshKey(
      (current) =>
        current + 1,
    )
  }


  function handleLinkStudent(
    event,
  ) {
    event.preventDefault()

    setPageError('')

    try {
      const linkedStudent =
        linkParentToStudent(
          user,
          studentCode.trim(),
        )

      setStudentCode('')

      setSelectedStudentId(
        String(
          linkedStudent.id,
        ),
      )

      refreshDashboard()
    } catch (
      error
    ) {
      setPageError(
        error?.message ||
          'Не удалось привязать ребёнка.',
      )
    }
  }


  function unlinkStudent(
    studentId,
  ) {
    const confirmed =
      window.confirm(
        'Удалить привязку к этому ребёнку?',
      )

    if (!confirmed) {
      return
    }

    removeParentLink(
      user.id,
      studentId,
    )

    setSelectedStudentId('')
    setMenuOpen(false)

    refreshDashboard()
  }


  function handleRewardChange(
    event,
  ) {
    const {
      name,
      value,
    } = event.target

    setRewardForm(
      (current) => ({
        ...current,
        [name]: value,
      }),
    )
  }


  function handleCreateReward(
    event,
  ) {
    event.preventDefault()

    if (!student) {
      return
    }

    try {
      createParentReward(
        user,
        student,
        rewardForm,
      )

      setRewardForm({
        title: '',
        description: '',
        requiredPoints: 500,
      })

      refreshDashboard()
    } catch (
      error
    ) {
      window.alert(
        error?.message ||
          'Не удалось создать награду.',
      )
    }
  }


  function handleClaimReward(
    reward,
  ) {
    if (!student) {
      return
    }

    const points =
      Number(
        student.points || 0,
      )

    const price =
      Number(
        reward.requiredPoints || 0,
      )

    if (
      points <
      price
    ) {
      window.alert(
        'Ребёнок ещё не набрал нужное количество баллов.',
      )

      return
    }

    try {
      claimParentReward(
        reward.id,
      )

      refreshDashboard()
    } catch (
      error
    ) {
      window.alert(
        error?.message ||
          'Не удалось выдать награду.',
      )
    }
  }


  if (!user) {
    return null
  }


  if (
    user.role !==
    'Родитель'
  ) {
    return (
      <>
        <ParentDiaryStyles />

        <div className="parent-diary-page">

          <SimpleEmptyState
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
        <ParentDiaryStyles />

        <div className="parent-diary-page">

          <header className="parent-diary-header">

            <div className="parent-diary-header-row">

              <div className="parent-diary-brand">
                <strong>
                  EduBoost
                </strong>

                <span>
                  Родительский дневник
                </span>
              </div>

            </div>

          </header>


          <main className="parent-diary-content">

            <section className="parent-link-welcome">

              <div className="parent-link-welcome-icon">
                <UserRound
                  size={32}
                />
              </div>

              <span>
                Родительский кабинет
              </span>

              <h1>
                Добавьте ребёнка
              </h1>

              <p>
                Введите код ученика,
                чтобы открыть его
                расписание, оценки,
                посещаемость и задания.
              </p>

            </section>


            <form
              className="parent-link-card"
              onSubmit={
                handleLinkStudent
              }
            >

              <div className="parent-link-card-title">

                <div className="parent-link-small-icon">
                  <Link2
                    size={21}
                  />
                </div>

                <div>
                  <span>
                    Привязка аккаунта
                  </span>

                  <strong>
                    Код ученика
                  </strong>
                </div>

              </div>


              {pageError && (
                <div className="parent-diary-error">
                  {
                    pageError
                  }
                </div>
              )}


              <input
                value={
                  studentCode
                }
                onChange={(
                  event,
                ) =>
                  setStudentCode(
                    event.target
                      .value,
                  )
                }
                placeholder="Например: EB-A12B34"
                required
              />


              <button
                type="submit"
              >
                <Link2
                  size={18}
                />

                Привязать ребёнка
              </button>

            </form>

          </main>

        </div>
      </>
    )
  }


  const attendance =
    calculateSupabaseAttendanceStats(
      attendanceRecords,
    )


  const averageGrade =
    calculateAverageGrade(
      grades,
    )


  const tasks =
    getStudentTasks(
      student,
    ) || []


  const overdueTasks =
    getOverdueTasks(
      student,
    ) || []


  const achievements =
    getUnlockedAchievements(
      student,
    ) || []


  const rewards =
    getParentRewards(
      user.id,
      student.id,
    ) || []


  const level =
    getLevelByXp(
      Number(
        student.xp || 0,
      ),
    )


  const latestGrades =
    [...grades]
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
      )
      .slice(
        0,
        4,
      )


  const latestTasks =
    [...tasks]
      .sort(
        (
          first,
          second,
        ) =>
          getDateTime(
            first.deadline,
          ) -
          getDateTime(
            second.deadline,
          ),
      )
      .slice(
        0,
        3,
      )


  const weekDays =
    getCurrentSchoolWeek()


  const menuItems = [
    {
      title:
        'Главная',
      icon:
        Home,
      to:
        '/',
    },
    {
      title:
        'Расписание',
      icon:
        CalendarDays,
      to:
        '/schedule',
    },
    {
      title:
        'Оценки',
      icon:
        GraduationCap,
      to:
        '/my-journal',
    },
    {
      title:
        'Четвертные оценки',
      icon:
        BarChart3,
      to:
        '/quarter-grades',
    },
    {
      title:
        'Посещаемость',
      icon:
        CheckCircle2,
      to:
  '/attendance',
    },
    {
      title:
        'Задания',
      icon:
        BookOpenCheck,
      to:
        '/parent-tasks',
    },
    {
      title:
        'Достижения',
      icon:
        Award,
      to:
        '/achievements',
    },
    {
      title:
        'Уведомления',
      icon:
        Bell,
      to:
        '/notifications',
    },
    {
      title:
        'Профиль',
      icon:
        UserRound,
      to:
        '/profile',
    },
  ]


  const quickItems = [
    {
      title:
        'Расписание',

      subtitle:
        'Уроки ребёнка',

      icon:
        CalendarDays,

      to:
        '/schedule',

      tone:
        'blue',
    },

    {
      title:
        'Оценки',

      subtitle:
        grades.length > 0
          ? `${grades.length} оценок`
          : 'Оценок пока нет',

      icon:
        GraduationCap,

      to:
        '/my-journal',

      tone:
        'indigo',
    },

    {
      title:
        'Четвертные оценки',

      subtitle:
        'Итоги по предметам за весь учебный год',

      icon:
        BarChart3,

      to:
        '/quarter-grades',

      tone:
        'quarter',

      quarters: [
        'I',
        'II',
        'III',
        'IV',
      ],
    },

    {
      title:
        'Посещаемость',

      subtitle:
        `${attendance.percent || 0}% посещений`,

      icon:
        CheckCircle2,

      to:
        '/my-journal',

      tone:
        'cyan',
    },

    {
      title:
        'Задания',

      subtitle:
        overdueTasks.length > 0
          ? `${overdueTasks.length} просрочено`
          : `${tasks.length} заданий`,

      icon:
        BookOpenCheck,

      to:
        '/parent-tasks',

      tone:
        'orange',
    },

    {
      title:
        'Достижения',

      subtitle:
        `${achievements.length} открыто`,

      icon:
        Award,

      to:
        '/achievements',

      tone:
        'purple',
    },

    {
      title:
        'Уведомления',

      subtitle:
        'Новости и события',

      icon:
        Bell,

      to:
        '/notifications',

      tone:
        'rose',
    },
  ]


  return (
    <>
      <ParentDiaryStyles />


      <div className="parent-diary-page">

        <header className="parent-diary-header">

          <div className="parent-diary-header-row">

            <button
              type="button"
              className="parent-header-icon-button"
              onClick={() =>
                setMenuOpen(true)
              }
              aria-label="Открыть меню"
            >
              <Menu
                size={24}
              />
            </button>


            <div className="parent-diary-brand">

              <strong>
                EduBoost
              </strong>

              <span>
                Дневник родителя
              </span>

            </div>


            <div className="parent-header-tools">

              <button
                type="button"
                className="parent-header-icon-button"
                onClick={
                  refreshDashboard
                }
                disabled={
                  academicLoading
                }
                aria-label="Обновить"
              >
                <RefreshCcw
                  size={21}
                />
              </button>


              <Link
                className="parent-header-icon-button"
                to="/notifications"
                aria-label="Уведомления"
              >
                <Bell
                  size={21}
                />
              </Link>

            </div>

          </div>


          <div className="parent-student-selector">

            <div className="parent-student-selector-avatar">
              {getInitials(
                student.name,
              )}
            </div>


            <div className="parent-student-selector-main">

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

            </div>


            <ChevronRight
              size={18}
            />

          </div>

        </header>


        <main className="parent-diary-content">

          {academicError && (
            <div className="parent-diary-error">
              {
                academicError
              }
            </div>
          )}


          <section className="parent-week-strip">

            {weekDays.map(
              (
                day,
              ) => {
                const active =
                  selectedDay ===
                  day.iso

                return (
                  <button
                    type="button"
                    key={
                      day.iso
                    }
                    className={
                      active
                        ? 'parent-week-day active'
                        : 'parent-week-day'
                    }
                    onClick={() =>
                      setSelectedDay(
                        day.iso,
                      )
                    }
                  >

                    <span>
                      {
                        day.weekday
                      }
                    </span>

                    <strong>
                      {
                        day.day
                      }
                    </strong>

                    <small>
                      {
                        day.month
                      }
                    </small>

                  </button>
                )
              },
            )}

          </section>


          <section className="parent-child-summary">

            <div className="parent-child-summary-top">

              <div>

                <span>
                  Ваш ребёнок
                </span>

                <h1>
                  {
                    student.name
                  }
                </h1>

              </div>


              <div className="parent-level-pill">

                <Sparkles
                  size={14}
                />

                {level?.name ||
                  'Ученик'}

              </div>

            </div>


            <div className="parent-child-meta">

              <span>
                <School
                  size={15}
                />

                {student.school ||
                  'Школа не указана'}
              </span>


              <span>
                <GraduationCap
                  size={15}
                />

                {getStudentClass(
                  student,
                ) ||
                  'Класс не указан'}
              </span>

            </div>


            <div className="parent-summary-numbers">

              <div>

                <strong>
                  {academicLoading
                    ? '...'
                    : averageGrade ??
                      '—'}
                </strong>

                <span>
                  Средний балл
                </span>

              </div>


              <div>

                <strong>
                  {academicLoading
                    ? '...'
                    : `${attendance.percent || 0}%`}
                </strong>

                <span>
                  Посещаемость
                </span>

              </div>


              <div>

                <strong>
                  {
                    student.points ||
                    0
                  }
                </strong>

                <span>
                  Баллы
                </span>

              </div>

            </div>

          </section>


          {overdueTasks.length >
            0 && (
            <Link
              to="/tasks"
              className="parent-warning-card"
            >

              <div>
                <AlertTriangle
                  size={21}
                />
              </div>


              <span>

                <strong>
                  Есть просроченные
                  задания
                </strong>

                <small>
                  Требуют внимания:{' '}
                  {
                    overdueTasks.length
                  }
                </small>

              </span>


              <ChevronRight
                size={18}
              />

            </Link>
          )}


          <section className="parent-main-section">

            <div className="parent-section-heading">

              <div>

                <span>
                  Быстрый доступ
                </span>

                <h2>
                  Дневник
                </h2>

              </div>


              {academicLoading && (
                <div className="parent-loading-label">

                  <RefreshCcw
                    size={14}
                  />

                  Обновление

                </div>
              )}

            </div>


            <div className="parent-diary-grid">

              {quickItems.map(
                (
                  item,
                ) => {
                  const Icon =
                    item.icon

                  return (
                    <Link
                      to={
                        item.to
                      }
                      className={`parent-diary-tile ${item.tone}`}
                      key={
                        item.title
                      }
                    >

                      <div className="parent-diary-tile-icon">
                        <Icon
                          size={26}
                        />
                      </div>


                      <div>

                        <strong>
                          {
                            item.title
                          }
                        </strong>

                        <span>
                          {
                            item.subtitle
                          }
                        </span>


                        {item.quarters && (
                          <div className="parent-quarter-preview">

                            {item.quarters.map(
                              (
                                quarter,
                              ) => (
                                <small
                                  key={
                                    quarter
                                  }
                                >
                                  {
                                    quarter
                                  }
                                </small>
                              ),
                            )}

                          </div>
                        )}

                      </div>


                      <ChevronRight
                        size={18}
                      />

                    </Link>
                  )
                },
              )}

            </div>

          </section>


          <section className="parent-info-card">

            <div className="parent-card-heading">

              <div>

                <span>
                  Успеваемость
                </span>

                <h2>
                  Последние оценки
                </h2>

              </div>


              <Link
                to="/my-journal"
              >
                Все

                <ChevronRight
                  size={15}
                />
              </Link>

            </div>


            {academicLoading &&
            grades.length ===
              0 ? (
              <SimpleEmptyState
                icon={
                  RefreshCcw
                }
                title="Загружаем оценки"
                text="Получаем данные из школьного журнала."
                compact
              />
            ) : latestGrades.length ===
              0 ? (
              <SimpleEmptyState
                icon={
                  GraduationCap
                }
                title="Оценок пока нет"
                text="Новые оценки появятся здесь."
                compact
              />
            ) : (
              <div className="parent-grade-list">

                {latestGrades.map(
                  (
                    grade,
                  ) => (
                    <article
                      className="parent-grade-item"
                      key={
                        grade.id
                      }
                    >

                      <div className="parent-grade-subject-icon">
                        <GraduationCap
                          size={18}
                        />
                      </div>


                      <div className="parent-grade-main">

                        <strong>
                          {grade.subject ||
                            'Предмет'}
                        </strong>

                        <span>
                          {grade.topic ||
                            grade.comment ||
                            'Оценка'}
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


          <section className="parent-info-card">

            <div className="parent-card-heading">

              <div>

                <span>
                  Посещаемость
                </span>

                <h2>
                  Посещение уроков
                </h2>

              </div>


              <strong className="parent-attendance-total">
                {attendance.percent ||
                  0}
                %
              </strong>

            </div>


            <div className="parent-attendance-progress">

              <span
                style={{
                  width:
                    `${Math.min(
                      100,
                      Number(
                        attendance.percent ||
                          0,
                      ),
                    )}%`,
                }}
              />

            </div>


            <div className="parent-attendance-stats">

              <AttendanceItem
                type="present"
                label="Был"
                value={
                  attendance.present ||
                  0
                }
              />


              <AttendanceItem
                type="absent"
                label="Пропуск"
                value={
                  attendance.absent ||
                  0
                }
              />


              <AttendanceItem
                type="late"
                label="Опоздал"
                value={
                  attendance.late ||
                  0
                }
              />


              <AttendanceItem
                type="excused"
                label="Уваж."
                value={
                  attendance.excused ||
                  0
                }
              />

            </div>

          </section>


          <section className="parent-info-card">

            <div className="parent-card-heading">

              <div>

                <span>
                  Учебный процесс
                </span>

                <h2>
                  Ближайшие задания
                </h2>

              </div>


              <Link
                to="/tasks"
              >
                Все

                <ChevronRight
                  size={15}
                />
              </Link>

            </div>


            {latestTasks.length ===
            0 ? (
              <SimpleEmptyState
                icon={
                  BookOpenCheck
                }
                title="Заданий пока нет"
                text="Новые задания появятся здесь."
                compact
              />
            ) : (
              <div className="parent-task-list">

                {latestTasks.map(
                  (
                    task,
                  ) => (
                    <article
                      className="parent-task-item"
                      key={
                        task.id
                      }
                    >

                      <div className="parent-task-icon">
                        <BookOpenCheck
                          size={18}
                        />
                      </div>


                      <div className="parent-task-main">

                        <strong>
                          {task.subject ||
                            'Предмет'}
                        </strong>

                        <span>
                          {task.title ||
                            'Задание'}
                        </span>

                        <small>
                          {task.deadline
                            ? `До ${formatDate(
                                task.deadline,
                              )}`
                            : 'Срок не указан'}
                        </small>

                      </div>


                      <ChevronRight
                        size={17}
                      />

                    </article>
                  ),
                )}

              </div>
            )}

          </section>


          <section className="parent-rewards-block">

            <button
              type="button"
              className="parent-rewards-toggle"
              onClick={() =>
                setRewardsOpen(
                  (current) =>
                    !current,
                )
              }
            >

              <div className="parent-reward-toggle-icon">
                <Gift
                  size={21}
                />
              </div>


              <div>

                <strong>
                  Домашние награды
                </strong>

                <span>
                  Мотивация за накопленные
                  баллы
                </span>

              </div>


              <ChevronRight
                className={
                  rewardsOpen
                    ? 'opened'
                    : ''
                }
                size={19}
              />

            </button>


            {rewardsOpen && (
              <div className="parent-rewards-content">

                <div className="parent-rewards-balance">

                  <span>
                    Баланс ребёнка
                  </span>

                  <strong>

                    <Coins
                      size={17}
                    />

                    {
                      student.points ||
                      0
                    }

                  </strong>

                </div>


                <form
                  className="parent-reward-form"
                  onSubmit={
                    handleCreateReward
                  }
                >

                  <h3>
                    Новая награда
                  </h3>


                  <label>

                    <span>
                      Название
                    </span>

                    <input
                      name="title"
                      value={
                        rewardForm.title
                      }
                      onChange={
                        handleRewardChange
                      }
                      placeholder="Например: поход в кино"
                      required
                    />

                  </label>


                  <label>

                    <span>
                      Описание
                    </span>

                    <textarea
                      name="description"
                      value={
                        rewardForm.description
                      }
                      onChange={
                        handleRewardChange
                      }
                      placeholder="Что получит ребёнок"
                    />

                  </label>


                  <label>

                    <span>
                      Стоимость в баллах
                    </span>

                    <input
                      type="number"
                      min="1"
                      name="requiredPoints"
                      value={
                        rewardForm.requiredPoints
                      }
                      onChange={
                        handleRewardChange
                      }
                      required
                    />

                  </label>


                  <button
                    type="submit"
                  >
                    <Gift
                      size={17}
                    />

                    Создать награду
                  </button>

                </form>


                <div className="parent-reward-list">

                  {rewards.length ===
                  0 ? (
                    <SimpleEmptyState
                      icon={
                        Gift
                      }
                      title="Наград пока нет"
                      text="Создайте первую домашнюю награду."
                      compact
                    />
                  ) : (
                    rewards.map(
                      (
                        reward,
                      ) => {
                        const available =
                          Number(
                            student.points ||
                              0,
                          ) >=
                          Number(
                            reward.requiredPoints ||
                              0,
                          )

                        return (
                          <article
                            className="parent-reward-item"
                            key={
                              reward.id
                            }
                          >

                            <div className="parent-reward-icon">
                              <Gift
                                size={18}
                              />
                            </div>


                            <div className="parent-reward-main">

                              <strong>
                                {
                                  reward.title
                                }
                              </strong>


                              {reward.description && (
                                <span>
                                  {
                                    reward.description
                                  }
                                </span>
                              )}


                              <small>

                                <Coins
                                  size={13}
                                />

                                {
                                  reward.requiredPoints
                                }{' '}
                                баллов

                              </small>

                            </div>


                            <button
                              type="button"
                              disabled={
                                reward.claimed ||
                                !available
                              }
                              onClick={() =>
                                handleClaimReward(
                                  reward,
                                )
                              }
                            >
                              {reward.claimed
                                ? 'Получено'
                                : available
                                  ? 'Выдать'
                                  : 'Недоступно'}
                            </button>

                          </article>
                        )
                      },
                    )
                  )}

                </div>

              </div>
            )}

          </section>

        </main>


        {menuOpen && (
          <div
            className="parent-menu-overlay"
            onMouseDown={(
              event,
            ) => {
              if (
                event.target ===
                event.currentTarget
              ) {
                setMenuOpen(false)
              }
            }}
          >

            <aside className="parent-side-menu">

              <div className="parent-side-menu-top">

                <div>

                  <span>
                    EduBoost
                  </span>

                  <strong>
                    Родитель
                  </strong>

                </div>


                <button
                  type="button"
                  onClick={() =>
                    setMenuOpen(false)
                  }
                  aria-label="Закрыть меню"
                >
                  <X
                    size={23}
                  />
                </button>

              </div>


              <div className="parent-menu-profile">

                <div className="parent-menu-avatar">
                  {getInitials(
                    user.name,
                  )}
                </div>


                <div>

                  <strong>
                    {user.name ||
                      'Родитель'}
                  </strong>

                  <span>
                    Родительский аккаунт
                  </span>

                </div>

              </div>


              <div className="parent-menu-child">

                <span>
                  Ребёнок
                </span>


                {students.map(
                  (
                    item,
                  ) => {
                    const active =
                      String(
                        item.id,
                      ) ===
                      String(
                        selectedStudentId,
                      )

                    return (
                      <button
                        type="button"
                        key={
                          item.id
                        }
                        className={
                          active
                            ? 'active'
                            : ''
                        }
                        onClick={() => {
                          setSelectedStudentId(
                            String(
                              item.id,
                            ),
                          )

                          setMenuOpen(false)
                        }}
                      >

                        <div>
                          {getInitials(
                            item.name,
                          )}
                        </div>

                        <span>

                          <strong>
                            {
                              item.name
                            }
                          </strong>

                          <small>
                            {getStudentClass(
                              item,
                            ) ||
                              'Класс не указан'}
                          </small>

                        </span>

                        {active && (
                          <CheckCircle2
                            size={17}
                          />
                        )}

                      </button>
                    )
                  },
                )}

              </div>


              <nav className="parent-menu-navigation">

                {menuItems.map(
                  (
                    item,
                  ) => {
                    const Icon =
                      item.icon

                    return (
                      <Link
                        to={
                          item.to
                        }
                        key={
                          item.title
                        }
                        onClick={() =>
                          setMenuOpen(false)
                        }
                      >

                        <Icon
                          size={20}
                        />

                        <span>
                          {
                            item.title
                          }
                        </span>

                        <ChevronRight
                          size={17}
                        />

                      </Link>
                    )
                  },
                )}

              </nav>


              <button
                type="button"
                className="parent-menu-unlink"
                onClick={() =>
                  unlinkStudent(
                    student.id,
                  )
                }
              >

                <Trash2
                  size={18}
                />

                Удалить привязку

              </button>

            </aside>

          </div>
        )}

      </div>
    </>
  )
}


function GradeBadge({
  value,
}) {
  const numericValue =
    Number(value)

  const gradeClass =
    numericValue >= 5
      ? 'excellent'
      : numericValue >= 4
        ? 'good'
        : numericValue >= 3
          ? 'average'
          : 'bad'

  return (
    <div
      className={`parent-grade-badge ${gradeClass}`}
    >
      {value}
    </div>
  )
}


function AttendanceItem({
  type,
  label,
  value,
}) {
  const icons = {
    present:
      CheckCircle2,

    absent:
      AlertTriangle,

    late:
      Clock3,

    excused:
      CalendarDays,
  }

  const Icon =
    icons[type] ||
    CheckCircle2

  return (
    <div
      className={`parent-attendance-stat ${type}`}
    >

      <Icon
        size={18}
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


function SimpleEmptyState({
  icon: Icon,
  title,
  text,
  compact = false,
}) {
  return (
    <div
      className={
        compact
          ? 'parent-simple-empty compact'
          : 'parent-simple-empty'
      }
    >

      <div>
        <Icon
          size={22}
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


function calculateAverageGrade(
  grades,
) {
  if (
    !grades ||
    grades.length === 0
  ) {
    return null
  }

  const validGrades =
    grades.filter(
      (grade) =>
        Number.isFinite(
          Number(
            grade.value,
          ),
        ),
    )

  if (
    validGrades.length ===
    0
  ) {
    return null
  }

  const total =
    validGrades.reduce(
      (
        sum,
        grade,
      ) =>
        sum +
        Number(
          grade.value,
        ),
      0,
    )

  return Number(
    (
      total /
      validGrades.length
    ).toFixed(2),
  )
}


function getCurrentSchoolWeek() {
  const today =
    new Date()

  today.setHours(
    12,
    0,
    0,
    0,
  )

  const dayNumber =
    today.getDay()

  const distanceToMonday =
    dayNumber === 0
      ? -6
      : 1 -
        dayNumber

  const monday =
    new Date(
      today,
    )

  monday.setDate(
    today.getDate() +
      distanceToMonday,
  )

  const weekNames = [
    'ПН',
    'ВТ',
    'СР',
    'ЧТ',
    'ПТ',
    'СБ',
  ]

  return weekNames.map(
    (
      weekday,
      index,
    ) => {
      const date =
        new Date(
          monday,
        )

      date.setDate(
        monday.getDate() +
          index,
      )

      return {
        weekday,

        day:
          String(
            date.getDate(),
          ),

        month:
          date
            .toLocaleDateString(
              'ru-RU',
              {
                month:
                  'short',
              },
            )
            .replace(
              '.',
              '',
            )
            .toUpperCase(),

        iso:
          toLocalDateKey(
            date,
          ),
      }
    },
  )
}


function toLocalDateKey(
  date,
) {
  const year =
    date.getFullYear()

  const month =
    String(
      date.getMonth() +
        1,
    ).padStart(
      2,
      '0',
    )

  const day =
    String(
      date.getDate(),
    ).padStart(
      2,
      '0',
    )

  return `${year}-${month}-${day}`
}


function getStudentClass(
  student,
) {
  return (
    student?.className ||
    student?.class_name ||
    ''
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
      (part) =>
        part[0]
          ?.toUpperCase() ||
        '',
    )
    .join('')
}


function getDateTime(
  value,
) {
  const date =
    parseDate(
      value,
    )

  return date
    ? date.getTime()
    : 0
}


function formatDate(
  value,
) {
  const date =
    parseDate(
      value,
    )

  if (!date) {
    return 'Дата не указана'
  }

  return date
    .toLocaleDateString(
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


function parseDate(
  value,
) {
  if (!value) {
    return null
  }

  const text =
    String(value)

  const date =
    text.includes('T')
      ? new Date(
          text,
        )
      : new Date(
          `${text}T12:00:00`,
        )

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return null
  }

  return date
}


function ParentDiaryStyles() {
  return (
    <style>{`
      .parent-diary-page,
      .parent-diary-page * {
        box-sizing: border-box;
      }

      .parent-diary-page {
        --parent-blue: #2563eb;
        --parent-blue-dark: #1d4ed8;
        --parent-blue-soft: #eff6ff;
        --parent-ink: #172554;
        --parent-text: #334155;
        --parent-muted: #64748b;
        --parent-border: #dbe5f0;
        --parent-background: #f7faff;

        width: 100%;
        min-width: 0;
        min-height: 100%;
        background: var(--parent-background);
        color: var(--parent-text);
      }

      .parent-diary-header {
        position: relative;
        overflow: hidden;
        padding: 18px 20px 20px;
        border-radius: 0 0 28px 28px;
        background:
          radial-gradient(
            circle at 92% 5%,
            rgba(255, 255, 255, 0.23),
            transparent 28%
          ),
          linear-gradient(
            135deg,
            #2563eb 0%,
            #3b82f6 58%,
            #6366f1 100%
          );
        color: #ffffff;
        box-shadow:
          0 12px 34px
          rgba(37, 99, 235, 0.18);
      }

      .parent-diary-header-row {
        display: grid;
        grid-template-columns:
          44px minmax(0, 1fr) auto;
        align-items: center;
        gap: 10px;
      }

      .parent-diary-brand {
        min-width: 0;
        text-align: center;
      }

      .parent-diary-brand strong {
        display: block;
        color: #ffffff;
        font-size: 22px;
        line-height: 1.05;
        letter-spacing: -0.02em;
      }

      .parent-diary-brand span {
        display: block;
        margin-top: 4px;
        color:
          rgba(
            255,
            255,
            255,
            0.76
          );
        font-size: 11px;
        font-weight: 700;
      }

      .parent-header-icon-button {
        width: 42px;
        height: 42px;
        display: grid;
        place-items: center;
        padding: 0;
        border:
          1px solid
          rgba(
            255,
            255,
            255,
            0.17
          );
        border-radius: 14px;
        background:
          rgba(
            255,
            255,
            255,
            0.11
          );
        color: #ffffff;
        text-decoration: none;
        cursor: pointer;
      }

      .parent-header-icon-button:disabled {
        opacity: 0.55;
        cursor: default;
      }

      .parent-header-tools {
        display: flex;
        gap: 7px;
      }

      .parent-student-selector {
        display: flex;
        align-items: center;
        gap: 11px;
        max-width: 520px;
        margin: 18px auto 0;
        padding: 10px 13px;
        border:
          1px solid
          rgba(
            255,
            255,
            255,
            0.28
          );
        border-radius: 17px;
        background:
          rgba(
            255,
            255,
            255,
            0.13
          );
        backdrop-filter:
          blur(10px);
      }

      .parent-student-selector-avatar {
        width: 40px;
        height: 40px;
        flex: 0 0 40px;
        display: grid;
        place-items: center;
        border-radius: 13px;
        background: #ffffff;
        color: var(--parent-blue);
        font-size: 13px;
        font-weight: 900;
      }

      .parent-student-selector-main {
        flex: 1;
        min-width: 0;
      }

      .parent-student-selector-main > span {
        display: block;
        margin-bottom: 2px;
        color:
          rgba(
            255,
            255,
            255,
            0.72
          );
        font-size: 9px;
        font-weight: 800;
        text-transform: uppercase;
        letter-spacing: 0.06em;
      }

      .parent-student-selector-main strong {
        display: block;
        overflow: hidden;
        color: #ffffff;
        font-size: 14px;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .parent-student-selector select {
        width: 100%;
        padding: 0;
        border: 0;
        background: transparent;
        color: #ffffff;
        font: inherit;
        font-size: 14px;
        font-weight: 900;
        outline: 0;
        appearance: auto;
      }

      .parent-student-selector select option {
        color: #172554;
        background: #ffffff;
      }

      .parent-diary-content {
        display: grid;
        gap: 17px;
        width: min(
          920px,
          100%
        );
        margin: 0 auto;
        padding: 17px 16px 36px;
      }

      .parent-week-strip {
        display: grid;
        grid-template-columns:
          repeat(
            6,
            minmax(66px, 1fr)
          );
        gap: 7px;
        overflow-x: auto;
        padding: 2px 0 3px;
        scrollbar-width: none;
      }

      .parent-week-strip::-webkit-scrollbar {
        display: none;
      }

      .parent-week-day {
        min-width: 66px;
        min-height: 76px;
        padding: 8px 5px;
        border:
          1px solid
          var(--parent-border);
        border-radius: 16px;
        background: #ffffff;
        color: var(--parent-muted);
        cursor: pointer;
        transition:
          transform 0.15s ease,
          border-color 0.15s ease,
          background 0.15s ease;
      }

      .parent-week-day span,
      .parent-week-day strong,
      .parent-week-day small {
        display: block;
        text-align: center;
      }

      .parent-week-day span {
        font-size: 10px;
        font-weight: 900;
      }

      .parent-week-day strong {
        margin-top: 3px;
        color: var(--parent-ink);
        font-size: 20px;
        line-height: 1;
      }

      .parent-week-day small {
        margin-top: 4px;
        font-size: 9px;
        font-weight: 800;
      }

      .parent-week-day.active {
        border-color: transparent;
        background:
          linear-gradient(
            145deg,
            #2563eb,
            #4f46e5
          );
        color:
          rgba(
            255,
            255,
            255,
            0.8
          );
        box-shadow:
          0 8px 20px
          rgba(
            37,
            99,
            235,
            0.22
          );
        transform:
          translateY(-1px);
      }

      .parent-week-day.active strong {
        color: #ffffff;
      }

      .parent-child-summary {
        padding: 18px;
        border:
          1px solid
          #dbeafe;
        border-radius: 22px;
        background:
          radial-gradient(
            circle at 92% 8%,
            rgba(
              96,
              165,
              250,
              0.18
            ),
            transparent 32%
          ),
          linear-gradient(
            145deg,
            #ffffff,
            #f8fbff
          );
      }

      .parent-child-summary-top {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 14px;
      }

      .parent-child-summary-top span {
        display: block;
        color: #94a3b8;
        font-size: 10px;
        font-weight: 900;
        text-transform: uppercase;
        letter-spacing: 0.05em;
      }

      .parent-child-summary-top h1 {
        margin: 4px 0 0;
        color: var(--parent-ink);
        font-size: 22px;
        line-height: 1.15;
      }

      .parent-level-pill {
        display: inline-flex;
        align-items: center;
        flex-shrink: 0;
        gap: 5px;
        padding: 7px 9px;
        border-radius: 10px;
        background: var(--parent-blue-soft);
        color: var(--parent-blue);
        font-size: 10px;
        font-weight: 900;
      }

      .parent-child-meta {
        display: flex;
        flex-wrap: wrap;
        gap: 7px 14px;
        margin-top: 10px;
      }

      .parent-child-meta span {
        display: inline-flex;
        align-items: center;
        gap: 5px;
        color: var(--parent-muted);
        font-size: 11px;
      }

      .parent-summary-numbers {
        display: grid;
        grid-template-columns:
          repeat(
            3,
            minmax(0, 1fr)
          );
        gap: 8px;
        margin-top: 16px;
      }

      .parent-summary-numbers > div {
        min-width: 0;
        padding: 11px 8px;
        border-radius: 13px;
        background: #f8fafc;
        text-align: center;
      }

      .parent-summary-numbers strong {
        display: block;
        color: var(--parent-ink);
        font-size: 18px;
      }

      .parent-summary-numbers span {
        display: block;
        margin-top: 3px;
        color: #94a3b8;
        font-size: 9px;
        font-weight: 700;
      }

      .parent-warning-card {
        display: flex;
        align-items: center;
        gap: 11px;
        padding: 13px;
        border:
          1px solid
          #fed7aa;
        border-radius: 16px;
        background: #fff7ed;
        color: inherit;
        text-decoration: none;
      }

      .parent-warning-card > div {
        width: 39px;
        height: 39px;
        flex: 0 0 39px;
        display: grid;
        place-items: center;
        border-radius: 12px;
        background: #ffedd5;
        color: #ea580c;
      }

      .parent-warning-card > span {
        flex: 1;
        min-width: 0;
      }

      .parent-warning-card strong,
      .parent-warning-card small {
        display: block;
      }

      .parent-warning-card strong {
        color: #9a3412;
        font-size: 12px;
      }

      .parent-warning-card small {
        margin-top: 3px;
        color: #c2410c;
        font-size: 10px;
      }

      .parent-warning-card > svg {
        color: #f97316;
      }

      .parent-main-section {
        min-width: 0;
      }

      .parent-section-heading,
      .parent-card-heading {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
      }

      .parent-section-heading {
        margin-bottom: 10px;
      }

      .parent-section-heading > div:first-child > span,
      .parent-card-heading > div > span {
        display: block;
        margin-bottom: 3px;
        color: #94a3b8;
        font-size: 9px;
        font-weight: 900;
        text-transform: uppercase;
        letter-spacing: 0.06em;
      }

      .parent-section-heading h2,
      .parent-card-heading h2 {
        margin: 0;
        color: var(--parent-ink);
      }

      .parent-section-heading h2 {
        font-size: 19px;
      }

      .parent-card-heading h2 {
        font-size: 17px;
      }

      .parent-loading-label {
        display: inline-flex;
        align-items: center;
        gap: 5px;
        color: var(--parent-blue);
        font-size: 10px;
        font-weight: 800;
      }

      .parent-diary-grid {
        display: grid;
        grid-template-columns:
          repeat(
            3,
            minmax(0, 1fr)
          );
        gap: 10px;
      }

      .parent-diary-tile {
        position: relative;
        display: flex;
        align-items: center;
        gap: 11px;
        min-width: 0;
        min-height: 104px;
        overflow: hidden;
        padding: 14px;
        border:
          1px solid
          #e5edf6;
        border-radius: 19px;
        background: #ffffff;
        color: inherit;
        text-decoration: none;
        box-shadow:
          0 4px 14px
          rgba(
            15,
            23,
            42,
            0.025
          );
        transition:
          transform 0.15s ease,
          border-color 0.15s ease;
      }

      .parent-diary-tile:hover {
        transform:
          translateY(-2px);
        border-color: #bfdbfe;
      }

      .parent-diary-tile-icon {
        width: 50px;
        height: 50px;
        flex: 0 0 50px;
        display: grid;
        place-items: center;
        border-radius: 16px;
      }

      .parent-diary-tile > div:nth-child(2) {
        flex: 1;
        min-width: 0;
      }

      .parent-diary-tile strong {
        display: block;
        overflow: hidden;
        color: var(--parent-ink);
        font-size: 13px;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .parent-diary-tile span {
        display: block;
        margin-top: 4px;
        overflow: hidden;
        color: var(--parent-muted);
        font-size: 10px;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .parent-diary-tile > svg {
        flex-shrink: 0;
        color: #cbd5e1;
      }

      .parent-diary-tile.quarter {
        grid-column: 1 / -1;
        min-height: 104px;
        border-color: #c7d2fe;
        background:
          radial-gradient(
            circle at 92% 8%,
            rgba(
              99,
              102,
              241,
              0.14
            ),
            transparent 34%
          ),
          linear-gradient(
            135deg,
            #ffffff 0%,
            #f5f7ff 58%,
            #eef2ff 100%
          );
        box-shadow:
          0 8px 24px
          rgba(
            79,
            70,
            229,
            0.10
          );
      }

      .parent-diary-tile.quarter:hover {
        border-color: #818cf8;
        transform:
          translateY(-2px);
      }

      .parent-diary-tile.quarter
      .parent-diary-tile-icon {
        width: 56px;
        height: 56px;
        flex: 0 0 56px;
        background:
          linear-gradient(
            145deg,
            #4f46e5,
            #2563eb
          );
        color: #ffffff;
        box-shadow:
          0 8px 18px
          rgba(
            79,
            70,
            229,
            0.22
          );
      }

      .parent-diary-tile.quarter strong {
        color: #312e81;
        font-size: 15px;
      }

      .parent-diary-tile.quarter
      > div:nth-child(2)
      > span {
        max-width: 420px;
        color: #64748b;
        font-size: 11px;
        white-space: normal;
      }

      .parent-diary-tile.quarter > svg {
        color: #6366f1;
      }

      .parent-quarter-preview {
        display: flex;
        align-items: center;
        gap: 6px;
        margin-top: 10px;
      }

      .parent-quarter-preview small {
        width: 28px;
        height: 25px;
        display: grid;
        place-items: center;
        border:
          1px solid
          #c7d2fe;
        border-radius: 8px;
        background:
          rgba(
            255,
            255,
            255,
            0.82
          );
        color: #4f46e5;
        font-size: 9px;
        font-weight: 900;
        line-height: 1;
      }

      .parent-diary-tile.blue
      .parent-diary-tile-icon {
        background: #eff6ff;
        color: #2563eb;
      }

      .parent-diary-tile.indigo
      .parent-diary-tile-icon {
        background: #eef2ff;
        color: #4f46e5;
      }

      .parent-diary-tile.cyan
      .parent-diary-tile-icon {
        background: #ecfeff;
        color: #0891b2;
      }

      .parent-diary-tile.orange
      .parent-diary-tile-icon {
        background: #fff7ed;
        color: #ea580c;
      }

      .parent-diary-tile.purple
      .parent-diary-tile-icon {
        background: #faf5ff;
        color: #7c3aed;
      }

      .parent-diary-tile.rose
      .parent-diary-tile-icon {
        background: #fff1f2;
        color: #e11d48;
      }

      .parent-info-card {
        min-width: 0;
        padding: 17px;
        border:
          1px solid
          #e5edf6;
        border-radius: 20px;
        background: #ffffff;
      }

      .parent-card-heading {
        margin-bottom: 13px;
      }

      .parent-card-heading > a {
        display: inline-flex;
        align-items: center;
        gap: 3px;
        color: var(--parent-blue);
        font-size: 10px;
        font-weight: 900;
        text-decoration: none;
      }

      .parent-grade-list,
      .parent-task-list {
        display: grid;
        gap: 8px;
      }

      .parent-grade-item,
      .parent-task-item {
        display: flex;
        align-items: center;
        gap: 10px;
        min-width: 0;
        padding: 10px;
        border:
          1px solid
          #edf2f7;
        border-radius: 14px;
        background: #fbfdff;
      }

      .parent-grade-subject-icon,
      .parent-task-icon {
        width: 38px;
        height: 38px;
        flex: 0 0 38px;
        display: grid;
        place-items: center;
        border-radius: 12px;
        background: var(--parent-blue-soft);
        color: var(--parent-blue);
      }

      .parent-grade-main,
      .parent-task-main {
        flex: 1;
        min-width: 0;
      }

      .parent-grade-main strong,
      .parent-grade-main span,
      .parent-task-main strong,
      .parent-task-main span {
        display: block;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .parent-grade-main strong,
      .parent-task-main strong {
        color: var(--parent-ink);
        font-size: 12px;
      }

      .parent-grade-main span,
      .parent-task-main span {
        margin-top: 2px;
        color: var(--parent-muted);
        font-size: 10px;
      }

      .parent-grade-main small,
      .parent-task-main small {
        display: block;
        margin-top: 3px;
        color: #94a3b8;
        font-size: 9px;
      }

      .parent-task-item > svg {
        flex-shrink: 0;
        color: #cbd5e1;
      }

      .parent-grade-badge {
        width: 38px;
        height: 38px;
        flex: 0 0 38px;
        display: grid;
        place-items: center;
        border-radius: 12px;
        font-size: 16px;
        font-weight: 900;
      }

      .parent-grade-badge.excellent {
        background: #dcfce7;
        color: #15803d;
      }

      .parent-grade-badge.good {
        background: #dbeafe;
        color: #1d4ed8;
      }

      .parent-grade-badge.average {
        background: #fef3c7;
        color: #b45309;
      }

      .parent-grade-badge.bad {
        background: #fee2e2;
        color: #b91c1c;
      }

      .parent-attendance-total {
        color: var(--parent-blue);
        font-size: 18px;
      }

      .parent-attendance-progress {
        height: 7px;
        overflow: hidden;
        margin-bottom: 14px;
        border-radius: 999px;
        background: #e2e8f0;
      }

      .parent-attendance-progress span {
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

      .parent-attendance-stats {
        display: grid;
        grid-template-columns:
          repeat(
            4,
            minmax(0, 1fr)
          );
        gap: 7px;
      }

      .parent-attendance-stat {
        min-width: 0;
        padding: 10px 5px;
        border-radius: 13px;
        text-align: center;
      }

      .parent-attendance-stat svg {
        margin-bottom: 3px;
      }

      .parent-attendance-stat strong {
        display: block;
        font-size: 16px;
      }

      .parent-attendance-stat span {
        display: block;
        margin-top: 2px;
        font-size: 8px;
        font-weight: 700;
      }

      .parent-attendance-stat.present {
        background: #ecfdf5;
        color: #15803d;
      }

      .parent-attendance-stat.absent {
        background: #fef2f2;
        color: #b91c1c;
      }

      .parent-attendance-stat.late {
        background: #fff7ed;
        color: #b45309;
      }

      .parent-attendance-stat.excused {
        background: #eff6ff;
        color: #1d4ed8;
      }

      .parent-rewards-block {
        overflow: hidden;
        border:
          1px solid
          #e5edf6;
        border-radius: 20px;
        background: #ffffff;
      }

      .parent-rewards-toggle {
        width: 100%;
        display: flex;
        align-items: center;
        gap: 11px;
        padding: 15px;
        border: 0;
        background: #ffffff;
        color: inherit;
        text-align: left;
        cursor: pointer;
      }

      .parent-reward-toggle-icon {
        width: 42px;
        height: 42px;
        flex: 0 0 42px;
        display: grid;
        place-items: center;
        border-radius: 13px;
        background: #faf5ff;
        color: #7c3aed;
      }

      .parent-rewards-toggle > div:nth-child(2) {
        flex: 1;
        min-width: 0;
      }

      .parent-rewards-toggle strong {
        display: block;
        color: var(--parent-ink);
        font-size: 13px;
      }

      .parent-rewards-toggle span {
        display: block;
        margin-top: 3px;
        color: var(--parent-muted);
        font-size: 10px;
      }

      .parent-rewards-toggle > svg {
        color: #94a3b8;
        transition:
          transform 0.18s ease;
      }

      .parent-rewards-toggle > svg.opened {
        transform:
          rotate(90deg);
      }

      .parent-rewards-content {
        display: grid;
        gap: 14px;
        padding:
          0 15px 15px;
        border-top:
          1px solid
          #f1f5f9;
      }

      .parent-rewards-balance {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 10px;
        padding-top: 13px;
      }

      .parent-rewards-balance span {
        color: var(--parent-muted);
        font-size: 11px;
      }

      .parent-rewards-balance strong {
        display: inline-flex;
        align-items: center;
        gap: 5px;
        color: #7c3aed;
        font-size: 14px;
      }

      .parent-reward-form {
        display: grid;
        gap: 10px;
        padding: 13px;
        border-radius: 15px;
        background: #fafafa;
      }

      .parent-reward-form h3 {
        margin: 0 0 2px;
        color: var(--parent-ink);
        font-size: 14px;
      }

      .parent-reward-form label {
        display: grid;
        gap: 5px;
      }

      .parent-reward-form label > span {
        color: var(--parent-muted);
        font-size: 10px;
        font-weight: 800;
      }

      .parent-reward-form input,
      .parent-reward-form textarea,
      .parent-link-card input {
        width: 100%;
        border:
          1px solid
          #dbe5f0;
        border-radius: 11px;
        background: #ffffff;
        color: var(--parent-ink);
        font: inherit;
        outline: 0;
      }

      .parent-reward-form input,
      .parent-link-card input {
        min-height: 42px;
        padding: 0 12px;
      }

      .parent-reward-form textarea {
        min-height: 72px;
        padding: 10px 12px;
        resize: vertical;
      }

      .parent-reward-form input:focus,
      .parent-reward-form textarea:focus,
      .parent-link-card input:focus {
        border-color: #60a5fa;
        box-shadow:
          0 0 0 3px
          rgba(
            96,
            165,
            250,
            0.12
          );
      }

      .parent-reward-form > button,
      .parent-link-card > button {
        min-height: 42px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 7px;
        border: 0;
        border-radius: 11px;
        background:
          linear-gradient(
            135deg,
            #2563eb,
            #4f46e5
          );
        color: #ffffff;
        font-weight: 900;
        cursor: pointer;
      }

      .parent-reward-list {
        display: grid;
        gap: 8px;
      }

      .parent-reward-item {
        display: flex;
        align-items: center;
        gap: 9px;
        min-width: 0;
        padding: 10px;
        border:
          1px solid
          #edf2f7;
        border-radius: 13px;
      }

      .parent-reward-icon {
        width: 37px;
        height: 37px;
        flex: 0 0 37px;
        display: grid;
        place-items: center;
        border-radius: 11px;
        background: #faf5ff;
        color: #7c3aed;
      }

      .parent-reward-main {
        flex: 1;
        min-width: 0;
      }

      .parent-reward-main strong,
      .parent-reward-main span {
        display: block;
      }

      .parent-reward-main strong {
        color: var(--parent-ink);
        font-size: 11px;
      }

      .parent-reward-main span {
        margin-top: 2px;
        color: var(--parent-muted);
        font-size: 9px;
      }

      .parent-reward-main small {
        display: inline-flex;
        align-items: center;
        gap: 3px;
        margin-top: 4px;
        color: #7c3aed;
        font-size: 9px;
        font-weight: 800;
      }

      .parent-reward-item > button {
        min-height: 32px;
        padding: 0 9px;
        border: 0;
        border-radius: 9px;
        background: var(--parent-blue);
        color: #ffffff;
        font-size: 9px;
        font-weight: 900;
        cursor: pointer;
      }

      .parent-reward-item > button:disabled {
        background: #e2e8f0;
        color: #94a3b8;
        cursor: default;
      }

      .parent-simple-empty {
        display: flex;
        align-items: center;
        gap: 11px;
        min-height: 130px;
        padding: 16px;
        border:
          1px dashed
          #dbe5f0;
        border-radius: 17px;
        background: #ffffff;
      }

      .parent-simple-empty.compact {
        min-height: 90px;
        background: #fbfdff;
      }

      .parent-simple-empty > div {
        width: 42px;
        height: 42px;
        flex: 0 0 42px;
        display: grid;
        place-items: center;
        border-radius: 13px;
        background: var(--parent-blue-soft);
        color: var(--parent-blue);
      }

      .parent-simple-empty > span {
        min-width: 0;
      }

      .parent-simple-empty strong,
      .parent-simple-empty small {
        display: block;
      }

      .parent-simple-empty strong {
        color: var(--parent-ink);
        font-size: 12px;
      }

      .parent-simple-empty small {
        margin-top: 3px;
        color: var(--parent-muted);
        font-size: 10px;
        line-height: 1.45;
      }

      .parent-diary-error {
        padding: 11px 13px;
        border:
          1px solid
          #fecaca;
        border-radius: 12px;
        background: #fef2f2;
        color: #b91c1c;
        font-size: 11px;
        font-weight: 800;
      }

      .parent-menu-overlay {
        position: fixed;
        z-index: 5000;
        inset: 0;
        display: flex;
        background:
          rgba(
            15,
            23,
            42,
            0.45
          );
        backdrop-filter:
          blur(3px);
      }

      .parent-side-menu {
        width:
          min(
            340px,
            88vw
          );
        height: 100%;
        overflow-y: auto;
        padding: 18px;
        background: #ffffff;
        box-shadow:
          16px 0 40px
          rgba(
            15,
            23,
            42,
            0.14
          );
        animation:
          parentMenuIn
          0.18s ease;
      }

      @keyframes parentMenuIn {
        from {
          transform:
            translateX(-100%);
        }

        to {
          transform:
            translateX(0);
        }
      }

      .parent-side-menu-top {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
      }

      .parent-side-menu-top span,
      .parent-side-menu-top strong {
        display: block;
      }

      .parent-side-menu-top span {
        color: var(--parent-blue);
        font-size: 17px;
        font-weight: 900;
      }

      .parent-side-menu-top strong {
        margin-top: 2px;
        color: #94a3b8;
        font-size: 10px;
      }

      .parent-side-menu-top button {
        width: 38px;
        height: 38px;
        display: grid;
        place-items: center;
        padding: 0;
        border: 0;
        border-radius: 12px;
        background: #f1f5f9;
        color: var(--parent-text);
        cursor: pointer;
      }

      .parent-menu-profile {
        display: flex;
        align-items: center;
        gap: 11px;
        margin-top: 20px;
        padding: 13px;
        border-radius: 16px;
        background:
          linear-gradient(
            145deg,
            #eff6ff,
            #f8faff
          );
      }

      .parent-menu-avatar {
        width: 46px;
        height: 46px;
        flex: 0 0 46px;
        display: grid;
        place-items: center;
        border-radius: 15px;
        background:
          linear-gradient(
            145deg,
            #2563eb,
            #4f46e5
          );
        color: #ffffff;
        font-size: 14px;
        font-weight: 900;
      }

      .parent-menu-profile strong,
      .parent-menu-profile span {
        display: block;
      }

      .parent-menu-profile strong {
        color: var(--parent-ink);
        font-size: 13px;
      }

      .parent-menu-profile span {
        margin-top: 2px;
        color: var(--parent-muted);
        font-size: 9px;
      }

      .parent-menu-child {
        display: grid;
        gap: 7px;
        margin-top: 20px;
      }

      .parent-menu-child > span {
        color: #94a3b8;
        font-size: 9px;
        font-weight: 900;
        text-transform: uppercase;
        letter-spacing: 0.07em;
      }

      .parent-menu-child > button {
        display: flex;
        align-items: center;
        gap: 9px;
        width: 100%;
        padding: 9px;
        border:
          1px solid
          #e5edf6;
        border-radius: 13px;
        background: #ffffff;
        color: inherit;
        text-align: left;
        cursor: pointer;
      }

      .parent-menu-child > button.active {
        border-color: #bfdbfe;
        background: #eff6ff;
      }

      .parent-menu-child > button > div {
        width: 34px;
        height: 34px;
        flex: 0 0 34px;
        display: grid;
        place-items: center;
        border-radius: 10px;
        background: #dbeafe;
        color: #1d4ed8;
        font-size: 10px;
        font-weight: 900;
      }

      .parent-menu-child > button > span {
        flex: 1;
        min-width: 0;
      }

      .parent-menu-child strong,
      .parent-menu-child small {
        display: block;
      }

      .parent-menu-child strong {
        overflow: hidden;
        color: var(--parent-ink);
        font-size: 11px;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .parent-menu-child small {
        margin-top: 2px;
        color: var(--parent-muted);
        font-size: 9px;
      }

      .parent-menu-child > button > svg {
        color: var(--parent-blue);
      }

      .parent-menu-navigation {
        display: grid;
        gap: 4px;
        margin-top: 20px;
      }

      .parent-menu-navigation a {
        display: flex;
        align-items: center;
        gap: 11px;
        min-height: 45px;
        padding: 0 11px;
        border-radius: 12px;
        color: var(--parent-text);
        text-decoration: none;
        transition:
          background 0.15s ease;
      }

      .parent-menu-navigation a:hover {
        background: #f8fafc;
      }

      .parent-menu-navigation a > svg:first-child {
        color: var(--parent-blue);
      }

      .parent-menu-navigation a > span {
        flex: 1;
        font-size: 12px;
        font-weight: 800;
      }

      .parent-menu-navigation a > svg:last-child {
        color: #cbd5e1;
      }

      .parent-menu-unlink {
        width: 100%;
        min-height: 43px;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 7px;
        margin-top: 22px;
        border:
          1px solid
          #fecaca;
        border-radius: 12px;
        background: #ffffff;
        color: #dc2626;
        font-weight: 800;
        cursor: pointer;
      }

      .parent-link-welcome {
        padding: 30px 20px;
        border:
          1px solid
          #dbeafe;
        border-radius: 22px;
        background:
          linear-gradient(
            145deg,
            #eff6ff,
            #ffffff
          );
        text-align: center;
      }

      .parent-link-welcome-icon {
        width: 64px;
        height: 64px;
        display: grid;
        place-items: center;
        margin: 0 auto 13px;
        border-radius: 20px;
        background:
          linear-gradient(
            145deg,
            #2563eb,
            #4f46e5
          );
        color: #ffffff;
      }

      .parent-link-welcome > span {
        color: var(--parent-blue);
        font-size: 10px;
        font-weight: 900;
        text-transform: uppercase;
      }

      .parent-link-welcome h1 {
        margin: 5px 0;
        color: var(--parent-ink);
        font-size: 24px;
      }

      .parent-link-welcome p {
        max-width: 470px;
        margin: 0 auto;
        color: var(--parent-muted);
        font-size: 11px;
        line-height: 1.55;
      }

      .parent-link-card {
        display: grid;
        gap: 12px;
        width:
          min(
            520px,
            100%
          );
        margin: 0 auto;
        padding: 17px;
        border:
          1px solid
          #e5edf6;
        border-radius: 19px;
        background: #ffffff;
      }

      .parent-link-card-title {
        display: flex;
        align-items: center;
        gap: 10px;
      }

      .parent-link-small-icon {
        width: 42px;
        height: 42px;
        flex: 0 0 42px;
        display: grid;
        place-items: center;
        border-radius: 13px;
        background: var(--parent-blue-soft);
        color: var(--parent-blue);
      }

      .parent-link-card-title span,
      .parent-link-card-title strong {
        display: block;
      }

      .parent-link-card-title span {
        color: #94a3b8;
        font-size: 9px;
      }

      .parent-link-card-title strong {
        margin-top: 2px;
        color: var(--parent-ink);
        font-size: 14px;
      }

      @media (
        max-width: 760px
      ) {
        .parent-diary-grid {
          grid-template-columns:
            repeat(
              2,
              minmax(0, 1fr)
            );
        }

        .parent-diary-tile {
          min-height: 118px;
          align-items: flex-start;
          flex-direction: column;
        }

        .parent-diary-tile > div:nth-child(2) {
          width: 100%;
        }

        .parent-diary-tile > svg {
          position: absolute;
          right: 12px;
          bottom: 12px;
        }

        .parent-diary-tile.quarter {
          grid-column: 1 / -1;
          min-height: 104px;
          flex-direction: row;
          align-items: center;
        }

        .parent-diary-tile.quarter
        > div:nth-child(2) {
          width: auto;
        }

        .parent-diary-tile.quarter > svg {
          position: static;
          margin-left: auto;
        }
      }

      @media (
        max-width: 520px
      ) {
        .parent-diary-header {
          padding:
            14px 13px 17px;
          border-radius:
            0 0 23px 23px;
        }

        .parent-diary-header-row {
          grid-template-columns:
            40px minmax(0, 1fr) auto;
        }

        .parent-header-icon-button {
          width: 39px;
          height: 39px;
          border-radius: 12px;
        }

        .parent-header-tools {
          gap: 4px;
        }

        .parent-diary-brand strong {
          font-size: 20px;
        }

        .parent-diary-brand span {
          font-size: 9px;
        }

        .parent-student-selector {
          margin-top: 14px;
          padding: 9px 11px;
          border-radius: 15px;
        }

        .parent-student-selector-avatar {
          width: 36px;
          height: 36px;
          flex-basis: 36px;
          border-radius: 11px;
          font-size: 11px;
        }

        .parent-student-selector-main strong,
        .parent-student-selector select {
          font-size: 12px;
        }

        .parent-diary-content {
          gap: 14px;
          padding:
            14px 11px 28px;
        }

        .parent-week-strip {
          grid-template-columns:
            repeat(
              6,
              66px
            );
          gap: 6px;
        }

        .parent-week-day {
          min-height: 69px;
          border-radius: 14px;
        }

        .parent-week-day strong {
          font-size: 17px;
        }

        .parent-child-summary {
          padding: 15px;
          border-radius: 18px;
        }

        .parent-child-summary-top h1 {
          font-size: 19px;
        }

        .parent-level-pill {
          padding: 6px 7px;
          font-size: 9px;
        }

        .parent-summary-numbers {
          gap: 6px;
        }

        .parent-summary-numbers > div {
          padding: 9px 5px;
        }

        .parent-summary-numbers strong {
          font-size: 16px;
        }

        .parent-summary-numbers span {
          font-size: 8px;
        }

        .parent-section-heading h2 {
          font-size: 17px;
        }

        .parent-diary-grid {
          gap: 8px;
        }

        .parent-diary-tile {
          min-height: 112px;
          padding: 12px;
          border-radius: 17px;
        }

        .parent-diary-tile-icon {
          width: 45px;
          height: 45px;
          flex-basis: 45px;
          border-radius: 14px;
        }

        .parent-diary-tile strong {
          font-size: 12px;
        }

        .parent-diary-tile span {
          font-size: 9px;
        }

        .parent-diary-tile.quarter {
          min-height: 100px;
        }

        .parent-diary-tile.quarter
        .parent-diary-tile-icon {
          width: 48px;
          height: 48px;
          flex-basis: 48px;
        }

        .parent-diary-tile.quarter strong {
          font-size: 13px;
        }

        .parent-quarter-preview {
          gap: 4px;
          margin-top: 7px;
        }

        .parent-quarter-preview small {
          width: 25px;
          height: 23px;
          border-radius: 7px;
          font-size: 8px;
        }

        .parent-info-card {
          padding: 14px;
          border-radius: 17px;
        }

        .parent-card-heading h2 {
          font-size: 15px;
        }

        .parent-attendance-stats {
          gap: 5px;
        }

        .parent-attendance-stat {
          padding:
            9px 3px;
          border-radius: 11px;
        }

        .parent-attendance-stat strong {
          font-size: 14px;
        }

        .parent-attendance-stat span {
          font-size: 7px;
        }

        .parent-grade-item,
        .parent-task-item {
          padding: 9px;
        }

        .parent-grade-subject-icon,
        .parent-task-icon {
          width: 35px;
          height: 35px;
          flex-basis: 35px;
        }

        .parent-grade-badge {
          width: 35px;
          height: 35px;
          flex-basis: 35px;
          font-size: 15px;
        }

        .parent-side-menu {
          width: 86vw;
          padding: 15px;
        }
      }
    `}</style>
  )
}


export default ParentDashboardPage