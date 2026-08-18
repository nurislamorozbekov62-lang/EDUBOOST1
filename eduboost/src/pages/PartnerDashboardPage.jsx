import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  AlertTriangle,
  Award,
  BookOpenCheck,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Coins,
  Gift,
  GraduationCap,
  Link2,
  Medal,
  RefreshCcw,
  School,
  Sparkles,
  Trash2,
  TrendingUp,
  UserRound,
} from 'lucide-react'

import { useAuth } from '../context/AuthContext'
import { useAutoRefresh } from '../hooks/useAutoRefresh'
import { getLevelByXp } from '../data/levels'
import { getUnlockedAchievements } from '../data/achievements'

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
  const { user } = useAuth()

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
    rewardForm,
    setRewardForm,
  ] = useState({
    title: '',
    description: '',
    requiredPoints: 500,
  })


  useEffect(() => {
    if (!user?.id) {
      return
    }

    const linked =
      getLinkedStudents(
        user.id,
      ) || []

    setStudents(
      linked,
    )

    setSelectedStudentId(
      (current) => {
        if (
          linked.some(
            (item) =>
              String(
                item.id,
              ) ===
              String(
                current,
              ),
          )
        ) {
          return current
        }

        return linked[0]?.id
          ? String(
              linked[0].id,
            )
          : ''
      },
    )
  }, [
    user?.id,
    refreshKey,
  ])


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
      setAcademicLoading(
        true,
      )

      setAcademicError('')

      /*
       * Гарантируем, что
       * родительская связь
       * существует в Supabase.
       *
       * После этого RLS
       * разрешает читать только
       * данные привязанного ребёнка.
       */
      await ensureParentLinksSynced(
        user.id,
      )

      const [
        gradeRows,
        attendanceRows,
      ] =
        await Promise.all([
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

      setGrades([])

      setAttendanceRecords(
        [],
      )

      setAcademicError(
        error?.message ||
          'Не удалось загрузить оценки и посещаемость ребёнка.',
      )
    } finally {
      setAcademicLoading(
        false,
      )
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
    if (
      !window.confirm(
        'Удалить привязку к этому ребёнку?',
      )
    ) {
      return
    }

    removeParentLink(
      user.id,
      studentId,
    )

    setSelectedStudentId(
      '',
    )

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
        [name]:
          value,
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

    if (
      Number(
        student.points ||
          0,
      ) <
      Number(
        reward.requiredPoints ||
          0,
      )
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
        <ParentStyles />

        <div className="parent-modern-page">

          <ParentEmpty
            icon={
              UserRound
            }

            title="Доступ запрещён"

            text="Эта страница предназначена для родительского аккаунта."
          />

        </div>
      </>
    )
  }


  if (!student) {
    return (
      <>
        <ParentStyles />

        <div className="parent-modern-page">

          <section className="parent-empty-hero">

            <div className="parent-empty-hero-icon">
              <UserRound
                size={34}
              />
            </div>

            <span>
              Родительский кабинет
            </span>

            <h1>
              Добавьте ребёнка
            </h1>

            <p>
              Введите код ученика
              из его профиля,
              чтобы видеть оценки,
              посещаемость,
              задания и прогресс.
            </p>

          </section>


          <form
            className="parent-panel parent-link-form"

            onSubmit={
              handleLinkStudent
            }
          >

            <PanelTitle
              eyebrow="Первый шаг"

              title="Привязать ребёнка"

              icon={
                Link2
              }
            />


            {pageError && (
              <div className="parent-message parent-message--error">
                {
                  pageError
                }
              </div>
            )}


            <label className="parent-field">

              <span>
                Код ученика
              </span>

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

            </label>


            <button
              className="parent-primary-button"

              type="submit"
            >
              <Link2
                size={18}
              />

              Привязать ребёнка
            </button>

          </form>

        </div>
      </>
    )
  }


  const tasks =
    getStudentTasks(
      student,
    ) || []


  const overdueTasks =
    getOverdueTasks(
      student,
    ) || []


  const completedTasks =
    tasks.filter(
      (task) =>
        task.status ===
        'approved',
    ).length


  const attendance =
    calculateSupabaseAttendanceStats(
      attendanceRecords,
    )


  const averageGrade =
    calculateAverageGrade(
      grades,
    )


  const achievements =
    getUnlockedAchievements(
      student,
    ) || []


  const level =
    getLevelByXp(
      Number(
        student.xp ||
          0,
      ),
    )


  const rewards =
    getParentRewards(
      user.id,
      student.id,
    ) || []


  const classmates =
    getClassmates(
      student,
    )


  const rankingPosition =
    classmates.findIndex(
      (item) =>
        String(
          item.id,
        ) ===
        String(
          student.id,
        ),
    ) + 1


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
        6,
      )


  const latestTasks =
    [...tasks]
      .reverse()
      .slice(
        0,
        5,
      )


  return (
    <>
      <ParentStyles />

      <div className="parent-modern-page">

        <header className="parent-header">

          <div>

            <span>
              Родительский кабинет
            </span>

            <h1>
              Прогресс ребёнка
            </h1>

            <p>
              Реальные оценки
              и посещаемость
              из школьного журнала
              EduBoost.
            </p>

          </div>


          <div className="parent-header-actions">

            {students.length >
              1 && (
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
            )}


            <button
              type="button"

              className="parent-refresh-button"

              onClick={
                refreshDashboard
              }

              disabled={
                academicLoading
              }

              title="Обновить данные"
            >
              <RefreshCcw
                size={18}
              />
            </button>

          </div>

        </header>


        <section className="parent-child-card">

          <div className="parent-child-main">

            <div className="parent-child-avatar">
              {getInitials(
                student.name,
              )}
            </div>


            <div className="parent-child-info">

              <span>
                Ваш ребёнок
              </span>

              <h2>
                {
                  student.name
                }
              </h2>


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

                  {student.className ||
                    'Класс не указан'}
                </span>

              </div>


              <div className="parent-level-badge">

                <Sparkles
                  size={15}
                />

                {level?.name ||
                  'Ученик'}

              </div>

            </div>

          </div>


          <button
            type="button"

            className="parent-remove-button"

            onClick={() =>
              unlinkStudent(
                student.id,
              )
            }
          >

            <Trash2
              size={17}
            />

            Удалить привязку

          </button>

        </section>


        {academicLoading && (
          <div className="parent-message parent-message--info">

            <RefreshCcw
              size={16}
            />

            Обновляем оценки
            и посещаемость...

          </div>
        )}


        {academicError && (
          <div className="parent-message parent-message--error">
            {
              academicError
            }
          </div>
        )}


        {overdueTasks.length >
          0 && (
          <section className="parent-alert-card">

            <div className="parent-alert-icon">
              <AlertTriangle
                size={22}
              />
            </div>


            <div>

              <strong>
                Есть просроченные
                задания
              </strong>

              <p>
                Требуют внимания:{' '}
                {
                  overdueTasks.length
                }
              </p>

            </div>


            <Link to="/tasks">

              Открыть

              <ChevronRight
                size={16}
              />

            </Link>

          </section>
        )}


        <section className="parent-overview-grid">

          <ParentMetric
            icon={
              TrendingUp
            }

            value={
              academicLoading
                ? '...'
                : averageGrade ??
                  '—'
            }

            label="Средний балл"

            hint={`${grades.length} оценок в журнале`}
          />


          <ParentMetric
            icon={
              CheckCircle2
            }

            value={
              academicLoading
                ? '...'
                : `${attendance.percent || 0}%`
            }

            label="Посещаемость"

            hint={`${attendanceRecords.length} записей`}
          />


          <ParentMetric
            icon={
              BookOpenCheck
            }

            value={
              completedTasks
            }

            label="Заданий выполнено"

            hint={`${overdueTasks.length} просрочено`}
          />


          <ParentMetric
            icon={
              Coins
            }

            value={
              student.points ||
              0
            }

            label="Баллов"

            hint={`XP: ${student.xp || 0}`}
          />

        </section>


        <section>

          <SectionTitle
            eyebrow="Быстрый доступ"

            title="Учебный процесс"
          />


          <div className="parent-quick-grid">

            <ParentQuickLink
              icon={
                GraduationCap
              }

              title="Успеваемость"

              text="Оценки и четверти"

              to="/my-journal"
            />


            <ParentQuickLink
              icon={
                CalendarDays
              }

              title="Расписание"

              text="Уроки ребёнка"

              to="/schedule"
            />


            <ParentQuickLink
              icon={
                BookOpenCheck
              }

              title="Задания"

              text="Текущие работы"

              to="/tasks"
            />


            <ParentQuickLink
              icon={
                Award
              }

              title="Достижения"

              text={`${achievements.length} открыто`}

              to="/achievements"
            />

          </div>

        </section>


        <div className="parent-dashboard-grid">

          <section className="parent-panel">

            <PanelHeader
              eyebrow="Успеваемость"

              title="Последние оценки"

              to="/my-journal"
            />


            {academicLoading &&
            grades.length ===
              0 ? (
              <ParentEmpty
                icon={
                  RefreshCcw
                }

                title="Загружаем оценки"

                text="Получаем данные из школьного журнала."
              />
            ) : latestGrades.length ===
              0 ? (
              <ParentEmpty
                icon={
                  GraduationCap
                }

                title="Оценок пока нет"

                text="После выставления учителем оценки появятся здесь."
              />
            ) : (
              <div className="parent-list">

                {latestGrades.map(
                  (
                    grade,
                  ) => (
                    <article
                      key={
                        grade.id
                      }

                      className="parent-grade-row"
                    >

                      <div className="parent-list-content">

                        <strong>
                          {grade.subject ||
                            'Предмет'}
                        </strong>

                        <span>
                          {grade.comment ||
                            grade.topic ||
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


          <section className="parent-panel">

            <div className="parent-panel-heading">

              <div>

                <span>
                  Посещаемость
                </span>

                <h2>
                  Учебная дисциплина
                </h2>

              </div>


              <strong className="parent-attendance-percent">
                {attendance.percent ||
                  0}
                %
              </strong>

            </div>


            <div className="parent-progress-track">

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


            <div className="parent-attendance-grid">

              <AttendanceStat
                value={
                  attendance.present ||
                  0
                }

                label="Присутствовал"

                type="present"
              />


              <AttendanceStat
                value={
                  attendance.absent ||
                  0
                }

                label="Отсутствовал"

                type="absent"
              />


              <AttendanceStat
                value={
                  attendance.late ||
                  0
                }

                label="Опоздал"

                type="late"
              />


              <AttendanceStat
                value={
                  attendance.excused ||
                  0
                }

                label="Уважительная"

                type="excused"
              />

            </div>

          </section>

        </div>


        <div className="parent-dashboard-grid">

          <section className="parent-panel">

            <PanelHeader
              eyebrow="Активность"

              title="Задания"

              to="/tasks"
            />


            {latestTasks.length ===
            0 ? (
              <ParentEmpty
                icon={
                  BookOpenCheck
                }

                title="Заданий пока нет"

                text="Новые задания появятся здесь."
              />
            ) : (
              <div className="parent-list">

                {latestTasks.map(
                  (
                    task,
                  ) => (
                    <article
                      key={
                        task.id
                      }

                      className="parent-task-row"
                    >

                      <div className="parent-list-icon">
                        <BookOpenCheck
                          size={18}
                        />
                      </div>


                      <div className="parent-list-content">

                        <strong>
                          {task.title ||
                            'Задание'}
                        </strong>

                        <span>
                          {task.subject ||
                            'Предмет'}
                        </span>

                        <small>
                          {task.deadline
                            ? `До ${formatDate(
                                task.deadline,
                              )}`
                            : 'Срок не указан'}
                        </small>

                      </div>


                      <TaskStatus
                        status={
                          task.status
                        }
                      />

                    </article>
                  ),
                )}

              </div>
            )}

          </section>


          <section className="parent-panel">

            <div className="parent-panel-heading">

              <div>

                <span>
                  Результаты
                </span>

                <h2>
                  Достижения
                </h2>

              </div>


              <div className="parent-ranking">

                <Medal
                  size={16}
                />

                {rankingPosition >
                0
                  ? `${rankingPosition} место`
                  : '—'}

              </div>

            </div>


            {achievements.length ===
            0 ? (
              <ParentEmpty
                icon={
                  Award
                }

                title="Достижений пока нет"

                text="Они появятся по мере прогресса ребёнка."
              />
            ) : (
              <div className="parent-achievement-grid">

                {achievements
                  .slice(
                    0,
                    6,
                  )
                  .map(
                    (
                      achievement,
                    ) => (
                      <article
                        key={
                          achievement.id
                        }

                        className="parent-achievement-item"
                      >

                        <span>
                          {achievement.icon ||
                            '🏆'}
                        </span>

                        <strong>
                          {
                            achievement.name
                          }
                        </strong>

                      </article>
                    ),
                  )}

              </div>
            )}

          </section>

        </div>


        <section>

          <SectionTitle
            eyebrow="Мотивация"

            title="Домашние награды"

            text="Создайте цель, которую ребёнок сможет получить за накопленные баллы."
          />


          <div className="parent-dashboard-grid">

            <form
              className="parent-panel parent-reward-form"

              onSubmit={
                handleCreateReward
              }
            >

              <PanelTitle
                eyebrow="Новая цель"

                title="Создать награду"

                icon={
                  Gift
                }
              />


              <label className="parent-field">

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


              <label className="parent-field">

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


              <label className="parent-field">

                <span>
                  Необходимо баллов
                </span>

                <input
                  type="number"

                  name="requiredPoints"

                  min="1"

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
                className="parent-primary-button"

                type="submit"
              >

                <Gift
                  size={18}
                />

                Создать награду

              </button>

            </form>


            <section className="parent-panel">

              <div className="parent-panel-heading">

                <div>

                  <span>
                    Доступно
                  </span>

                  <h2>
                    Награды ребёнка
                  </h2>

                </div>


                <div className="parent-points">

                  <Coins
                    size={16}
                  />

                  {student.points ||
                    0}

                </div>

              </div>


              {rewards.length ===
              0 ? (
                <ParentEmpty
                  icon={
                    Gift
                  }

                  title="Наград пока нет"

                  text="Создайте первую домашнюю награду."
                />
              ) : (
                <div className="parent-reward-list">

                  {rewards.map(
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
                          key={
                            reward.id
                          }

                          className="parent-reward-card"
                        >

                          <div className="parent-reward-icon">
                            <Gift
                              size={20}
                            />
                          </div>


                          <div className="parent-reward-content">

                            <strong>
                              {
                                reward.title
                              }
                            </strong>


                            {reward.description && (
                              <p>
                                {
                                  reward.description
                                }
                              </p>
                            )}


                            <span>

                              <Coins
                                size={14}
                              />

                              {
                                reward.requiredPoints
                              }{' '}
                              баллов

                            </span>

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
                  )}

                </div>
              )}

            </section>

          </div>

        </section>

      </div>
    </>
  )
}


function calculateAverageGrade(
  grades,
) {
  if (
    !grades.length
  ) {
    return null
  }

  const total =
    grades.reduce(
      (
        sum,
        grade,
      ) =>
        sum +
        Number(
          grade.value ||
            0,
        ),
      0,
    )

  return Number(
    (
      total /
      grades.length
    ).toFixed(2),
  )
}


function SectionTitle({
  eyebrow,
  title,
  text = '',
}) {
  return (
    <div className="parent-section-title">

      <div>

        <span>
          {eyebrow}
        </span>

        <h2>
          {title}
        </h2>

      </div>


      {text && (
        <p>
          {text}
        </p>
      )}

    </div>
  )
}


function PanelHeader({
  eyebrow,
  title,
  to,
}) {
  return (
    <div className="parent-panel-heading">

      <div>

        <span>
          {eyebrow}
        </span>

        <h2>
          {title}
        </h2>

      </div>


      <Link
        to={
          to
        }
      >
        Все

        <ChevronRight
          size={16}
        />
      </Link>

    </div>
  )
}


function PanelTitle({
  eyebrow,
  title,
  icon: Icon,
}) {
  return (
    <div className="parent-panel-heading">

      <div>

        <span>
          {eyebrow}
        </span>

        <h2>
          {title}
        </h2>

      </div>

      <Icon
        size={22}
      />

    </div>
  )
}


function ParentMetric({
  icon: Icon,
  value,
  label,
  hint,
}) {
  return (
    <article className="parent-metric-card">

      <div className="parent-metric-icon">
        <Icon
          size={21}
        />
      </div>


      <div>

        <strong>
          {value}
        </strong>

        <span>
          {label}
        </span>

        <small>
          {hint}
        </small>

      </div>

    </article>
  )
}


function ParentQuickLink({
  icon: Icon,
  title,
  text,
  to,
}) {
  return (
    <Link
      to={
        to
      }

      className="parent-quick-card"
    >

      <div className="parent-quick-icon">
        <Icon
          size={21}
        />
      </div>


      <div>

        <strong>
          {title}
        </strong>

        <span>
          {text}
        </span>

      </div>


      <ChevronRight
        size={17}
      />

    </Link>
  )
}


function AttendanceStat({
  value,
  label,
  type,
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
    <article
      className={`parent-attendance-item ${type}`}
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

    </article>
  )
}


function ParentEmpty({
  icon: Icon,
  title,
  text,
}) {
  return (
    <div className="parent-empty-state">

      <div>
        <Icon
          size={23}
        />
      </div>


      <section>

        <strong>
          {title}
        </strong>

        <p>
          {text}
        </p>

      </section>

    </div>
  )
}


function GradeBadge({
  value,
}) {
  const numericValue =
    Number(value)

  const type =
    numericValue >= 5
      ? 'excellent'
      : numericValue >= 4
        ? 'good'
        : numericValue >= 3
          ? 'average'
          : 'bad'

  return (
    <span
      className={`parent-grade-badge ${type}`}
    >
      {value}
    </span>
  )
}


function TaskStatus({
  status,
}) {
  const labels = {
    new:
      'Не выполнено',

    pending:
      'На проверке',

    approved:
      'Принято',

    rejected:
      'Исправить',
  }

  return (
    <span
      className={`parent-task-status ${
        status ||
        'new'
      }`}
    >
      {labels[status] ||
        'Не выполнено'}
    </span>
  )
}


function getClassmates(
  student,
) {
  try {
    const users =
      JSON.parse(
        localStorage.getItem(
          'eduboost_users',
        ) || '[]',
      )

    return users
      .filter(
        (item) =>
          item.role ===
            'Ученик' &&
          item.school ===
            student.school &&
          item.className ===
            student.className,
      )
      .sort(
        (
          first,
          second,
        ) =>
          Number(
            second.xp ||
              0,
          ) -
          Number(
            first.xp ||
              0,
          ),
      )
  } catch {
    return []
  }
}


function getDateTime(
  value,
) {
  return (
    parseDate(
      value,
    )?.getTime() ||
    0
  )
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
    text.includes(
      'T',
    )
      ? new Date(
          text,
        )
      : new Date(
          `${text}T12:00:00`,
        )

  return Number.isNaN(
    date.getTime(),
  )
    ? null
    : date
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
    .filter(
      Boolean,
    )
    .slice(
      0,
      2,
    )
    .map(
      (word) =>
        word[0]
          ?.toUpperCase() ||
        '',
    )
    .join('')
}


function ParentStyles() {
  return (
    <style>{`
      .parent-modern-page,
      .parent-modern-page * {
        box-sizing: border-box;
      }

      .parent-modern-page {
        display: grid;
        gap: 20px;
        width: 100%;
        min-width: 0;
      }

      .parent-header {
        display: flex;
        align-items: flex-end;
        justify-content: space-between;
        gap: 18px;
      }

      .parent-header > div:first-child > span,
      .parent-section-title > div > span,
      .parent-panel-heading > div > span {
        display: block;
        margin-bottom: 4px;
        color: #94a3b8;
        font-size: 11px;
        font-weight: 900;
        letter-spacing: 0.06em;
        text-transform: uppercase;
      }

      .parent-header h1 {
        margin: 0;
        color: #102343;
        font-size: 30px;
        line-height: 1.1;
      }

      .parent-header p {
        margin: 7px 0 0;
        color: #64748b;
        font-size: 14px;
      }

      .parent-header-actions {
        display: flex;
        align-items: center;
        gap: 9px;
      }

      .parent-header select {
        min-width: 190px;
        min-height: 42px;
        padding: 0 38px 0 12px;
        border: 1px solid #dbe5f0;
        border-radius: 12px;
        background: #ffffff;
        color: #102343;
        font: inherit;
        font-size: 13px;
        font-weight: 800;
        outline: none;
      }

      .parent-refresh-button {
        width: 42px;
        height: 42px;
        display: grid;
        place-items: center;
        border: 1px solid #dbeafe;
        border-radius: 12px;
        background: #eff6ff;
        color: #2563eb;
        cursor: pointer;
      }

      .parent-refresh-button:disabled {
        opacity: 0.55;
        cursor: default;
      }

      .parent-child-card {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 18px;
        padding: 22px;
        border: 1px solid #dbeafe;
        border-radius: 24px;
        background:
          radial-gradient(
            circle at 90% 10%,
            rgba(96, 165, 250, 0.2),
            transparent 34%
          ),
          linear-gradient(
            135deg,
            #eff6ff 0%,
            #ffffff 72%
          );
      }

      .parent-child-main {
        display: flex;
        align-items: center;
        gap: 15px;
        min-width: 0;
      }

      .parent-child-avatar {
        width: 62px;
        height: 62px;
        flex: 0 0 62px;
        display: grid;
        place-items: center;
        border-radius: 19px;
        background:
          linear-gradient(
            145deg,
            #2563eb,
            #4f46e5
          );
        color: #ffffff;
        font-size: 21px;
        font-weight: 900;
        box-shadow:
          0 12px 26px
          rgba(37, 99, 235, 0.2);
      }

      .parent-child-info {
        min-width: 0;
      }

      .parent-child-info > span {
        color: #64748b;
        font-size: 12px;
        font-weight: 800;
      }

      .parent-child-info h2 {
        margin: 3px 0 7px;
        color: #102343;
        font-size: 23px;
      }

      .parent-child-meta {
        display: flex;
        flex-wrap: wrap;
        gap: 8px 14px;
      }

      .parent-child-meta span {
        display: inline-flex;
        align-items: center;
        gap: 5px;
        color: #64748b;
        font-size: 12px;
      }

      .parent-level-badge {
        display: inline-flex;
        align-items: center;
        gap: 5px;
        margin-top: 9px;
        padding: 6px 9px;
        border-radius: 9px;
        background: #ffffff;
        color: #2563eb;
        font-size: 11px;
        font-weight: 900;
      }

      .parent-remove-button {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 7px;
        min-height: 40px;
        padding: 0 13px;
        border: 1px solid #fecaca;
        border-radius: 12px;
        background: #ffffff;
        color: #dc2626;
        font-weight: 800;
        cursor: pointer;
      }

      .parent-message {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 11px 13px;
        border-radius: 12px;
        font-size: 12px;
        font-weight: 800;
      }

      .parent-message--info {
        border: 1px solid #dbeafe;
        background: #eff6ff;
        color: #1d4ed8;
      }

      .parent-message--error {
        border: 1px solid #fecaca;
        background: #fef2f2;
        color: #b91c1c;
      }

      .parent-alert-card {
        display: flex;
        align-items: center;
        gap: 13px;
        padding: 15px 17px;
        border: 1px solid #fed7aa;
        border-radius: 17px;
        background: #fff7ed;
      }

      .parent-alert-icon {
        width: 42px;
        height: 42px;
        flex: 0 0 42px;
        display: grid;
        place-items: center;
        border-radius: 13px;
        background: #ffedd5;
        color: #ea580c;
      }

      .parent-alert-card > div:nth-child(2) {
        flex: 1;
      }

      .parent-alert-card strong {
        color: #9a3412;
        font-size: 14px;
      }

      .parent-alert-card p {
        margin: 3px 0 0;
        color: #c2410c;
        font-size: 12px;
      }

      .parent-alert-card a,
      .parent-panel-heading > a {
        display: inline-flex;
        align-items: center;
        gap: 3px;
        text-decoration: none;
        font-size: 12px;
        font-weight: 900;
      }

      .parent-alert-card a {
        color: #ea580c;
      }

      .parent-panel-heading > a {
        color: #2563eb;
      }

      .parent-overview-grid {
        display: grid;
        grid-template-columns:
          repeat(4, minmax(0, 1fr));
        gap: 11px;
      }

      .parent-metric-card {
        display: flex;
        align-items: center;
        gap: 11px;
        min-width: 0;
        padding: 15px;
        border: 1px solid #e5edf6;
        border-radius: 18px;
        background: #ffffff;
      }

      .parent-metric-icon,
      .parent-quick-icon,
      .parent-list-icon {
        display: grid;
        place-items: center;
        flex-shrink: 0;
        background: #eff6ff;
        color: #2563eb;
      }

      .parent-metric-icon {
        width: 42px;
        height: 42px;
        border-radius: 13px;
      }

      .parent-metric-card strong {
        display: block;
        color: #102343;
        font-size: 20px;
        line-height: 1;
      }

      .parent-metric-card span {
        display: block;
        margin-top: 5px;
        color: #475569;
        font-size: 12px;
        font-weight: 800;
      }

      .parent-metric-card small {
        display: block;
        margin-top: 3px;
        color: #94a3b8;
        font-size: 10px;
      }

      .parent-section-title {
        display: flex;
        align-items: flex-end;
        justify-content: space-between;
        gap: 18px;
        margin-bottom: 12px;
      }

      .parent-section-title h2,
      .parent-panel-heading h2 {
        margin: 0;
        color: #102343;
      }

      .parent-section-title h2 {
        font-size: 20px;
      }

      .parent-section-title > p {
        max-width: 430px;
        margin: 0;
        color: #64748b;
        font-size: 12px;
        text-align: right;
      }

      .parent-quick-grid {
        display: grid;
        grid-template-columns:
          repeat(4, minmax(0, 1fr));
        gap: 10px;
      }

      .parent-quick-card {
        display: flex;
        align-items: center;
        gap: 10px;
        min-width: 0;
        padding: 14px;
        border: 1px solid #e5edf6;
        border-radius: 17px;
        background: #ffffff;
        color: inherit;
        text-decoration: none;
        transition:
          transform 0.18s ease,
          border-color 0.18s ease;
      }

      .parent-quick-card:hover {
        transform: translateY(-2px);
        border-color: #93c5fd;
      }

      .parent-quick-icon {
        width: 40px;
        height: 40px;
        border-radius: 12px;
      }

      .parent-quick-card > div:nth-child(2) {
        flex: 1;
        min-width: 0;
      }

      .parent-quick-card strong {
        display: block;
        color: #102343;
        font-size: 13px;
      }

      .parent-quick-card span {
        display: block;
        margin-top: 3px;
        overflow: hidden;
        color: #64748b;
        font-size: 11px;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .parent-quick-card > svg {
        color: #94a3b8;
      }

      .parent-dashboard-grid {
        display: grid;
        grid-template-columns:
          repeat(2, minmax(0, 1fr));
        gap: 15px;
      }

      .parent-panel {
        min-width: 0;
        padding: 18px;
        border: 1px solid #e5edf6;
        border-radius: 21px;
        background: #ffffff;
      }

      .parent-panel-heading {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        margin-bottom: 14px;
      }

      .parent-panel-heading h2 {
        font-size: 18px;
      }

      .parent-panel-heading > svg {
        color: #2563eb;
      }

      .parent-list {
        display: grid;
        gap: 9px;
      }

      .parent-grade-row,
      .parent-task-row {
        display: flex;
        align-items: center;
        gap: 10px;
        min-width: 0;
        padding: 11px;
        border: 1px solid #edf2f7;
        border-radius: 14px;
        background: #fbfdff;
      }

      .parent-list-icon {
        width: 39px;
        height: 39px;
        border-radius: 12px;
      }

      .parent-list-content {
        flex: 1;
        min-width: 0;
      }

      .parent-list-content strong,
      .parent-list-content span {
        display: block;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .parent-list-content strong {
        color: #102343;
        font-size: 13px;
      }

      .parent-list-content span {
        margin-top: 3px;
        color: #64748b;
        font-size: 11px;
      }

      .parent-list-content small {
        display: block;
        margin-top: 4px;
        color: #94a3b8;
        font-size: 10px;
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
        color: #15803d;
        background: #dcfce7;
      }

      .parent-grade-badge.good {
        color: #1d4ed8;
        background: #dbeafe;
      }

      .parent-grade-badge.average {
        color: #b45309;
        background: #fef3c7;
      }

      .parent-grade-badge.bad {
        color: #b91c1c;
        background: #fee2e2;
      }

      .parent-task-status {
        flex-shrink: 0;
        padding: 6px 8px;
        border-radius: 9px;
        font-size: 10px;
        font-weight: 900;
      }

      .parent-task-status.new {
        color: #64748b;
        background: #f1f5f9;
      }

      .parent-task-status.pending {
        color: #b45309;
        background: #fff7ed;
      }

      .parent-task-status.approved {
        color: #15803d;
        background: #ecfdf5;
      }

      .parent-task-status.rejected {
        color: #b91c1c;
        background: #fef2f2;
      }

      .parent-attendance-percent,
      .parent-ranking,
      .parent-points {
        display: inline-flex;
        align-items: center;
        gap: 5px;
        color: #2563eb;
        font-size: 12px;
        font-weight: 900;
      }

      .parent-progress-track {
        height: 8px;
        overflow: hidden;
        margin: 6px 0 16px;
        border-radius: 999px;
        background: #e2e8f0;
      }

      .parent-progress-track span {
        display: block;
        height: 100%;
        border-radius: inherit;
        background: #2563eb;
      }

      .parent-attendance-grid {
        display: grid;
        grid-template-columns:
          repeat(4, minmax(0, 1fr));
        gap: 7px;
      }

      .parent-attendance-item {
        min-width: 0;
        padding: 11px 7px;
        border-radius: 13px;
        text-align: center;
      }

      .parent-attendance-item svg {
        margin-bottom: 4px;
      }

      .parent-attendance-item strong {
        display: block;
        font-size: 18px;
      }

      .parent-attendance-item span {
        display: block;
        margin-top: 3px;
        font-size: 9px;
      }

      .parent-attendance-item.present {
        color: #15803d;
        background: #ecfdf5;
      }

      .parent-attendance-item.absent {
        color: #b91c1c;
        background: #fef2f2;
      }

      .parent-attendance-item.late {
        color: #b45309;
        background: #fff7ed;
      }

      .parent-attendance-item.excused {
        color: #1d4ed8;
        background: #eff6ff;
      }

      .parent-achievement-grid {
        display: grid;
        grid-template-columns:
          repeat(3, minmax(0, 1fr));
        gap: 8px;
      }

      .parent-achievement-item {
        display: grid;
        place-items: center;
        gap: 6px;
        min-width: 0;
        min-height: 96px;
        padding: 11px;
        border: 1px solid #edf2f7;
        border-radius: 14px;
        background: #fbfdff;
        text-align: center;
      }

      .parent-achievement-item > span {
        font-size: 23px;
      }

      .parent-achievement-item strong {
        width: 100%;
        overflow: hidden;
        color: #102343;
        font-size: 11px;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .parent-reward-form {
        display: grid;
        align-content: start;
        gap: 11px;
      }

      .parent-field {
        display: grid;
        gap: 6px;
      }

      .parent-field > span {
        color: #475569;
        font-size: 11px;
        font-weight: 800;
      }

      .parent-field input,
      .parent-field textarea {
        width: 100%;
        border: 1px solid #dbe5f0;
        border-radius: 12px;
        background: #ffffff;
        color: #102343;
        font: inherit;
        outline: none;
      }

      .parent-field input {
        min-height: 44px;
        padding: 0 13px;
      }

      .parent-field textarea {
        min-height: 90px;
        padding: 12px 13px;
        resize: vertical;
      }

      .parent-primary-button {
        min-height: 44px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 7px;
        padding: 0 16px;
        border: 0;
        border-radius: 12px;
        background: #2563eb;
        color: #ffffff;
        font-weight: 900;
        cursor: pointer;
      }

      .parent-reward-list {
        display: grid;
        gap: 9px;
      }

      .parent-reward-card {
        display: flex;
        align-items: center;
        gap: 10px;
        min-width: 0;
        padding: 12px;
        border: 1px solid #edf2f7;
        border-radius: 14px;
        background: #fbfdff;
      }

      .parent-reward-icon {
        width: 40px;
        height: 40px;
        flex: 0 0 40px;
        display: grid;
        place-items: center;
        border-radius: 12px;
        background: #faf5ff;
        color: #7c3aed;
      }

      .parent-reward-content {
        flex: 1;
        min-width: 0;
      }

      .parent-reward-content strong {
        display: block;
        color: #102343;
        font-size: 13px;
      }

      .parent-reward-content p {
        margin: 4px 0;
        color: #64748b;
        font-size: 11px;
      }

      .parent-reward-content span {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        color: #7c3aed;
        font-size: 10px;
        font-weight: 900;
      }

      .parent-reward-card button {
        min-height: 34px;
        padding: 0 10px;
        border: 0;
        border-radius: 9px;
        background: #2563eb;
        color: #ffffff;
        font-size: 10px;
        font-weight: 900;
        cursor: pointer;
      }

      .parent-reward-card button:disabled {
        background: #e2e8f0;
        color: #94a3b8;
        cursor: default;
      }

      .parent-empty-state {
        display: flex;
        align-items: center;
        gap: 12px;
        min-height: 110px;
        padding: 15px;
        border: 1px dashed #d6e1ed;
        border-radius: 15px;
        background: #fbfdff;
      }

      .parent-empty-state > div {
        width: 42px;
        height: 42px;
        flex: 0 0 42px;
        display: grid;
        place-items: center;
        border-radius: 13px;
        background: #eff6ff;
        color: #2563eb;
      }

      .parent-empty-state strong {
        color: #102343;
        font-size: 13px;
      }

      .parent-empty-state p {
        margin: 4px 0 0;
        color: #64748b;
        font-size: 11px;
        line-height: 1.5;
      }

      .parent-empty-hero {
        padding: 34px 24px;
        border-radius: 24px;
        background:
          linear-gradient(
            145deg,
            #eff6ff,
            #ffffff
          );
        text-align: center;
      }

      .parent-empty-hero-icon {
        width: 68px;
        height: 68px;
        display: grid;
        place-items: center;
        margin: 0 auto 16px;
        border-radius: 21px;
        background: #2563eb;
        color: #ffffff;
      }

      .parent-empty-hero > span {
        color: #2563eb;
        font-size: 12px;
        font-weight: 900;
      }

      .parent-empty-hero h1 {
        margin: 6px 0;
        color: #102343;
        font-size: 28px;
      }

      .parent-empty-hero p {
        max-width: 520px;
        margin: 0 auto;
        color: #64748b;
        font-size: 13px;
        line-height: 1.6;
      }

      .parent-link-form {
        width: min(600px, 100%);
        margin: 0 auto;
      }

      @media (max-width: 950px) {
        .parent-overview-grid,
        .parent-quick-grid {
          grid-template-columns:
            repeat(2, minmax(0, 1fr));
        }

        .parent-dashboard-grid {
          grid-template-columns: 1fr;
        }
      }

      @media (max-width: 620px) {
        .parent-modern-page {
          gap: 16px;
        }

        .parent-header {
          align-items: stretch;
          flex-direction: column;
          gap: 11px;
        }

        .parent-header h1 {
          font-size: 24px;
        }

        .parent-header-actions,
        .parent-header select {
          width: 100%;
        }

        .parent-header select {
          min-width: 0;
          flex: 1;
        }

        .parent-child-card {
          align-items: stretch;
          flex-direction: column;
          padding: 17px;
          border-radius: 20px;
        }

        .parent-child-avatar {
          width: 53px;
          height: 53px;
          flex-basis: 53px;
          border-radius: 16px;
          font-size: 18px;
        }

        .parent-child-info h2 {
          font-size: 19px;
        }

        .parent-remove-button {
          width: 100%;
        }

        .parent-overview-grid {
          gap: 8px;
        }

        .parent-metric-card {
          align-items: flex-start;
          flex-direction: column;
          gap: 8px;
          padding: 13px;
        }

        .parent-quick-grid {
          gap: 8px;
        }

        .parent-quick-card {
          align-items: flex-start;
          flex-direction: column;
          padding: 13px;
        }

        .parent-quick-card > svg {
          display: none;
        }

        .parent-panel {
          padding: 14px;
          border-radius: 17px;
        }

        .parent-section-title {
          align-items: flex-start;
          flex-direction: column;
          gap: 5px;
        }

        .parent-section-title > p {
          text-align: left;
        }

        .parent-task-status {
          display: none;
        }

        .parent-attendance-grid {
          grid-template-columns:
            repeat(2, minmax(0, 1fr));
        }

        .parent-achievement-grid {
          grid-template-columns:
            repeat(2, minmax(0, 1fr));
        }

        .parent-reward-card {
          align-items: stretch;
          flex-wrap: wrap;
        }

        .parent-reward-content {
          width:
            calc(100% - 52px);
        }

        .parent-reward-card button {
          width: 100%;
          min-height: 38px;
        }

        .parent-alert-card {
          align-items: flex-start;
          flex-wrap: wrap;
        }

        .parent-alert-card a {
          width: 100%;
          padding-left: 55px;
        }
      }
    `}</style>
  )
}


export default ParentDashboardPage