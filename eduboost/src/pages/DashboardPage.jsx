import { useMemo } from 'react'
import { Link } from 'react-router-dom'

import {
  Award,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  Coins,
  Flame,
  GraduationCap,
  MessageCircle,
  Trophy,
} from 'lucide-react'

import { useAuth } from '../context/AuthContext'

import {
  getLevelByXp,
  getLevelProgress,
  getNextLevel,
} from '../data/levels'

import {
  getUnlockedAchievements,
} from '../data/achievements'

import TeacherDashboardModern
  from '../components/TeacherDashboardModern'

import {
  getStudentSubmission,
  getTasksForStudent,
  getTeacherSubmissions,
} from '../services/taskService'

import {
  getLessonsByDay,
  getTeacherLessons,
  getTodayName,
} from '../services/scheduleService'

import {
  calculateAverageGrade,
  getStudentGrades,
} from '../services/journalService'

function DashboardPage() {
  const { user } = useAuth()

  const dashboard = useMemo(() => {
    if (!user) {
      return null
    }

    if (user.role === 'Учитель') {
      return createTeacherDashboard(user)
    }

    return createStudentDashboard(user)
  }, [user])

  if (!user || !dashboard) {
    return null
  }

  /*
    УЧИТЕЛЬ

    Отдельный интерфейс.
    Никаких XP, уровней,
    streak и ученического welcome.
  */
  if (user.role === 'Учитель') {
    return (
      <div className="dashboard-page">
        <TeacherDashboardModern
          dashboard={dashboard}
        />
      </div>
    )
  }

  /*
    УЧЕНИК

    Старую геймификацию
    сохраняем.
  */
  return (
    <div className="dashboard-page">
      <StudentWelcome
        user={user}
        dashboard={dashboard}
      />

      <StudentStatistics
        statistics={dashboard.statistics}
      />

      <StudentQuickActions
        actions={dashboard.quickActions}
      />

      <StudentTasks
        dashboard={dashboard}
      />

      <StudentProgress
        dashboard={dashboard}
      />

      <StudentNotifications />
    </div>
  )
}

/* ========================================
   TEACHER DATA
======================================== */

function createTeacherDashboard(user) {
  const submissions =
    getTeacherSubmissions(user) || []

  const pendingSubmissions =
    submissions.filter(
      (submission) =>
        submission.status === 'pending',
    )

  const teacherLessons =
    getTeacherLessons(user.id) || []

  const todayName =
    getTodayName()

  const todayLessons =
    teacherLessons
      .filter(
        (lesson) =>
          lesson.day === todayName,
      )
      .sort((first, second) => {
        const firstNumber =
          Number(
            first.lessonNumber,
          ) || 999

        const secondNumber =
          Number(
            second.lessonNumber,
          ) || 999

        if (
          firstNumber !==
          secondNumber
        ) {
          return (
            firstNumber -
            secondNumber
          )
        }

        return String(
          first.startTime || '',
        ).localeCompare(
          String(
            second.startTime || '',
          ),
        )
      })

  return {
    pendingSubmissions,
    todayLessons,
  }
}

/* ========================================
   STUDENT DATA
======================================== */

function createStudentDashboard(user) {
  const points =
    Number(user.points ?? 0)

  const xp =
    Number(user.xp ?? 0)

  const streak =
    Number(user.streak ?? 0)

  const level =
    getLevelByXp(xp)

  const nextLevel =
    getNextLevel(xp)

  const levelProgress =
    getLevelProgress(xp)

  const achievementsCount =
    getUnlockedAchievements(
      user,
    ).length

  const tasks =
    getTasksForStudent(
      user,
    ) || []

  const taskItems =
    tasks.map((task) => ({
      task,

      submission:
        getStudentSubmission(
          task.id,
          user.id,
        ),
    }))

  const activeTasks =
    taskItems.filter(
      ({ submission }) =>
        !submission ||
        submission.status ===
          'rejected',
    )

  const pendingTasks =
    taskItems.filter(
      ({ submission }) =>
        submission?.status ===
        'pending',
    )

  const completedTasks =
    taskItems.filter(
      ({ submission }) =>
        submission?.status ===
        'approved',
    )

  const upcomingTasks =
    activeTasks
      .slice()
      .sort(
        (first, second) =>
          getDeadlineTime(
            first.task.deadline,
          ) -
          getDeadlineTime(
            second.task.deadline,
          ),
      )
      .slice(0, 3)

  const todayName =
    getTodayName()

  const todayLessons =
    user.school &&
    user.className
      ? getLessonsByDay(
          user.school,
          user.className,
          todayName,
        )
      : []

  const grades =
    getStudentGrades(
      user.id,
    ) || []

  const averageGrade =
    calculateAverageGrade(
      grades,
    )

  return {
    points,
    xp,
    streak,

    level,
    nextLevel,
    levelProgress,

    achievementsCount,

    upcomingTasks,
    todayLessons,

    grades,
    averageGrade,

    activeTasksCount:
      activeTasks.length,

    pendingTasksCount:
      pendingTasks.length,

    completedTasksCount:
      completedTasks.length,

    statistics: [
      {
        id: 'points',
        title:
          points.toLocaleString(
            'ru-RU',
          ),
        subtitle: 'Баллов',
        icon: Coins,
        colorClass:
          'dashboard-stat-icon--orange',
      },

      {
        id: 'level',
        title: level.id,
        subtitle: 'Уровень',
        icon: Trophy,
        colorClass:
          'dashboard-stat-icon--blue',
      },

      {
        id: 'streak',
        title: streak,
        subtitle: 'Дней подряд',
        icon: Flame,
        colorClass:
          'dashboard-stat-icon--green',
      },

      {
        id: 'achievements',
        title: achievementsCount,
        subtitle: 'Достижений',
        icon: Award,
        colorClass:
          'dashboard-stat-icon--purple',
      },
    ],

    quickActions: [
      {
        id: 'tasks',
        title: 'Мои задания',
        subtitle:
          activeTasks.length === 0
            ? 'Активных заданий нет'
            : `${activeTasks.length} активных`,
        path: '/tasks',
        icon: ClipboardList,
      },

      {
        id: 'schedule',
        title: 'Расписание',
        subtitle:
          todayLessons.length === 0
            ? 'Сегодня уроков нет'
            : `${todayLessons.length} уроков сегодня`,
        path: '/schedule',
        icon: CalendarDays,
      },

      {
        id: 'courses',
        title: 'Учебные курсы',
        subtitle:
          'Открыть каталог курсов',
        path: '/courses',
        icon: BookOpen,
      },

      {
        id: 'journal',
        title: 'Успеваемость',
        subtitle:
          grades.length === 0
            ? 'Оценок пока нет'
            : `Средний балл ${averageGrade}`,
        path: '/my-journal',
        icon: GraduationCap,
      },
    ],
  }
}

/* ========================================
   STUDENT WELCOME
======================================== */

function StudentWelcome({
  user,
  dashboard,
}) {
  return (
    <section className="dashboard-welcome">
      <div className="dashboard-welcome-content">
        <p className="dashboard-welcome-label">
          Добро пожаловать
        </p>

        <h1>
          Привет,{' '}
          {user.name ||
            'Пользователь'}!
        </h1>

        <p>
          Выполняйте задания,
          проходите курсы и
          получайте награды за
          реальные результаты.
        </p>

        <div className="dashboard-level">
          <div className="dashboard-level-badge">
            {dashboard.level.id}
          </div>

          <div className="dashboard-level-info">
            <strong>
              Уровень «
              {dashboard.level.name}
              »
            </strong>

            <div className="dashboard-progress">
              <span
                style={{
                  width:
                    `${dashboard.levelProgress}%`,
                }}
              />
            </div>

            <p
              style={{
                marginTop: '7px',
                fontSize: '12px',
              }}
            >
              {dashboard.xp.toLocaleString(
                'ru-RU',
              )}{' '}
              XP

              {dashboard.nextLevel
                ? ` из ${dashboard.nextLevel.minXp.toLocaleString(
                    'ru-RU',
                  )} XP`
                : ' · максимальный уровень'}
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}

/* ========================================
   STUDENT STATS
======================================== */

function StudentStatistics({
  statistics,
}) {
  return (
    <section className="dashboard-stats">
      {statistics.map((item) => {
        const Icon = item.icon

        return (
          <article
            key={item.id}
            className="dashboard-stat-card"
          >
            <div
              className={`dashboard-stat-icon ${item.colorClass}`}
            >
              <Icon size={22} />
            </div>

            <div className="dashboard-stat-content">
              <strong>
                {item.title}
              </strong>

              <span>
                {item.subtitle}
              </span>
            </div>
          </article>
        )
      })}
    </section>
  )
}

/* ========================================
   STUDENT QUICK ACCESS
======================================== */

function StudentQuickActions({
  actions,
}) {
  return (
    <section>
      <div className="dashboard-section-header">
        <h2>
          Быстрый доступ
        </h2>

        <Link to="/profile">
          Профиль
        </Link>
      </div>

      <div className="dashboard-quick-grid">
        {actions.map((action) => {
          const Icon =
            action.icon

          return (
            <Link
              key={action.id}
              to={action.path}
              className="dashboard-quick-card"
            >
              <div className="dashboard-quick-icon">
                <Icon size={22} />
              </div>

              <div
                style={{
                  minWidth: 0,
                  flex: 1,
                }}
              >
                <strong>
                  {action.title}
                </strong>

                <span>
                  {action.subtitle}
                </span>
              </div>

              <ChevronRight
                size={18}
                color="#94a3b8"
              />
            </Link>
          )
        })}
      </div>
    </section>
  )
}

/* ========================================
   STUDENT TASKS
======================================== */

function StudentTasks({
  dashboard,
}) {
  return (
    <section>
      <div className="dashboard-section-header">
        <h2>
          Ближайшие задания
        </h2>

        <Link to="/tasks">
          Смотреть все
        </Link>
      </div>

      {dashboard.upcomingTasks
        .length === 0 ? (
        <DashboardEmpty
          icon={ClipboardList}
          title="Активных заданий нет"
          text="Новые задания учителя появятся здесь."
        />
      ) : (
        <div className="dashboard-task-list">
          {dashboard.upcomingTasks.map(
            ({
              task,
              submission,
            }) => (
              <Link
                key={task.id}
                to="/tasks"
                className="dashboard-task-item"
              >
                <div className="dashboard-task-marker">
                  <ClipboardList
                    size={21}
                  />
                </div>

                <div className="dashboard-task-content">
                  <strong>
                    {task.subject ||
                      'Задание'}
                  </strong>

                  <span>
                    {task.title}
                  </span>

                  <span
                    style={{
                      marginTop: '5px',
                      fontSize: '11px',
                    }}
                  >
                    {formatDeadline(
                      task.deadline,
                    )}
                  </span>
                </div>

                <div className="dashboard-task-status">
                  {getSubmissionStatus(
                    submission,
                  )}
                </div>
              </Link>
            ),
          )}
        </div>
      )}
    </section>
  )
}

/* ========================================
   STUDENT PROGRESS
======================================== */

function StudentProgress({
  dashboard,
}) {
  return (
    <section>
      <div className="dashboard-section-header">
        <h2>
          Твой прогресс
        </h2>
      </div>

      <div className="content-card">
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '14px',
          }}
        >
          <div className="dashboard-quick-icon">
            <CheckCircle2 size={23} />
          </div>

          <div style={{ flex: 1 }}>
            <strong>
              {dashboard
                .completedTasksCount >
              0
                ? 'Реальные результаты'
                : 'Результатов пока нет'}
            </strong>

            <p
              style={{
                margin: '5px 0 0',
                color: '#718096',
                fontSize: '13px',
                lineHeight: 1.5,
              }}
            >
              Принято учителем:{' '}
              {
                dashboard
                  .completedTasksCount
              }
              . На проверке:{' '}
              {
                dashboard
                  .pendingTasksCount
              }
              . Баллов:{' '}
              {dashboard.points}.
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}

/* ========================================
   NOTIFICATIONS
======================================== */

function StudentNotifications() {
  return (
    <Link
      to="/notifications"
      className="content-card"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '14px',
        textDecoration: 'none',
      }}
    >
      <div className="dashboard-quick-icon">
        <MessageCircle size={23} />
      </div>

      <div style={{ flex: 1 }}>
        <strong>
          Уведомления
        </strong>

        <p
          style={{
            margin: '5px 0 0',
            color: '#718096',
            fontSize: '13px',
            lineHeight: 1.5,
          }}
        >
          Новые задания, отчёты
          и другие события.
        </p>
      </div>

      <ChevronRight
        size={20}
        color="#94a3b8"
      />
    </Link>
  )
}

/* ========================================
   EMPTY
======================================== */

function DashboardEmpty({
  icon: Icon,
  title,
  text,
}) {
  return (
    <div className="content-card">
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '14px',
        }}
      >
        <div className="dashboard-quick-icon">
          <Icon size={23} />
        </div>

        <div>
          <strong>{title}</strong>

          <p
            style={{
              margin: '5px 0 0',
              color: '#718096',
              fontSize: '13px',
              lineHeight: 1.5,
            }}
          >
            {text}
          </p>
        </div>
      </div>
    </div>
  )
}

/* ========================================
   HELPERS
======================================== */

function getSubmissionStatus(
  submission,
) {
  if (!submission) {
    return 'Не начато'
  }

  if (
    submission.status ===
    'approved'
  ) {
    return 'Выполнено'
  }

  if (
    submission.status ===
    'rejected'
  ) {
    return 'Нужно исправить'
  }

  return 'На проверке'
}

function getDeadlineTime(
  deadline,
) {
  if (!deadline) {
    return Number.MAX_SAFE_INTEGER
  }

  const time = new Date(
    `${deadline}T23:59:59`,
  ).getTime()

  return Number.isNaN(time)
    ? Number.MAX_SAFE_INTEGER
    : time
}

function formatDeadline(
  deadline,
) {
  if (!deadline) {
    return 'Срок не указан'
  }

  const date = new Date(
    `${deadline}T00:00:00`,
  )

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return deadline
  }

  return `До ${date.toLocaleDateString(
    'ru-RU',
  )}`
}

export default DashboardPage