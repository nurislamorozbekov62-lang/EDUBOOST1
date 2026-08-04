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
  Star,
  Target,
  Trophy,
} from 'lucide-react'

import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

function DashboardPage() {
  const { user } = useAuth()

  const userName =
    user?.name || 'Пользователь'

  const points =
    Number(user?.points) || 2540

  const xp =
    Number(user?.xp) || 1460

  const streak =
    Number(user?.streak) || 7

  const level =
    Number(user?.level) || 12

  const nextLevelXp = 2500

  const progressPercent = Math.min(
    Math.round((xp / nextLevelXp) * 100),
    100
  )

  const statistics = [
    {
      id: 'points',
      title: points.toLocaleString('ru-RU'),
      subtitle: 'Баллов',
      icon: Coins,
      colorClass: 'dashboard-stat-icon--orange',
    },
    {
      id: 'level',
      title: level,
      subtitle: 'Уровень',
      icon: Trophy,
      colorClass: 'dashboard-stat-icon--blue',
    },
    {
      id: 'streak',
      title: streak,
      subtitle: 'Дней подряд',
      icon: Flame,
      colorClass: 'dashboard-stat-icon--green',
    },
    {
      id: 'achievements',
      title: 8,
      subtitle: 'Достижений',
      icon: Award,
      colorClass: 'dashboard-stat-icon--purple',
    },
  ]

  const quickActions = [
    {
      id: 'tasks',
      title: 'Мои задания',
      subtitle: '3 активных задания',
      path: '/tasks',
      icon: ClipboardList,
    },
    {
      id: 'schedule',
      title: 'Расписание',
      subtitle: '5 уроков сегодня',
      path: '/schedule',
      icon: CalendarDays,
    },
    {
      id: 'courses',
      title: 'Учебные курсы',
      subtitle: 'Продолжить обучение',
      path: '/courses',
      icon: BookOpen,
    },
    {
      id: 'journal',
      title: 'Успеваемость',
      subtitle: 'Средний балл 4.7',
      path: '/my-journal',
      icon: GraduationCap,
    },
  ]

  const upcomingTasks = [
    {
      id: 'math',
      subject: 'Математика',
      title: 'Квадратные уравнения',
      deadline: 'Сегодня, 18:00',
      status: 'В процессе',
      icon: Target,
    },
    {
      id: 'russian',
      subject: 'Русский язык',
      title: 'Сочинение «Мой любимый герой»',
      deadline: 'Завтра, 15:00',
      status: 'Не начато',
      icon: BookOpen,
    },
    {
      id: 'chemistry',
      subject: 'Химия',
      title: 'Химические реакции',
      deadline: '12 августа',
      status: 'В процессе',
      icon: Star,
    },
  ]

  return (
    <div className="dashboard-page">
      <section className="dashboard-welcome">
        <div className="dashboard-welcome-content">
          <p className="dashboard-welcome-label">
            Добро пожаловать
          </p>

          <h1>Привет, {userName}!</h1>

          <p>
            Продолжай учиться, выполняй задания и
            получай награды за свои успехи.
          </p>

          <div className="dashboard-level">
            <div className="dashboard-level-badge">
              {level}
            </div>

            <div className="dashboard-level-info">
              <strong>
                Уровень «Отличник»
              </strong>

              <div className="dashboard-progress">
                <span
                  style={{
                    width: `${progressPercent}%`,
                  }}
                />
              </div>

              <p
                style={{
                  marginTop: '7px',
                  fontSize: '12px',
                }}
              >
                {xp.toLocaleString('ru-RU')} из{' '}
                {nextLevelXp.toLocaleString('ru-RU')}{' '}
                XP
              </p>
            </div>
          </div>
        </div>
      </section>

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
                <strong>{item.title}</strong>
                <span>{item.subtitle}</span>
              </div>
            </article>
          )
        })}
      </section>

      <section>
        <div className="dashboard-section-header">
          <h2>Быстрый доступ</h2>

          <Link to="/profile">
            Профиль
          </Link>
        </div>

        <div className="dashboard-quick-grid">
          {quickActions.map((action) => {
            const Icon = action.icon

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
                  <strong>{action.title}</strong>
                  <span>{action.subtitle}</span>
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

      <section>
        <div className="dashboard-section-header">
          <h2>Ближайшие задания</h2>

          <Link to="/tasks">
            Смотреть все
          </Link>
        </div>

        <div className="dashboard-task-list">
          {upcomingTasks.map((task) => {
            const Icon = task.icon

            return (
              <Link
                key={task.id}
                to="/tasks"
                className="dashboard-task-item"
              >
                <div className="dashboard-task-marker">
                  <Icon size={21} />
                </div>

                <div className="dashboard-task-content">
                  <strong>{task.subject}</strong>

                  <span>{task.title}</span>

                  <span
                    style={{
                      marginTop: '5px',
                      fontSize: '11px',
                    }}
                  >
                    {task.deadline}
                  </span>
                </div>

                <div className="dashboard-task-status">
                  {task.status}
                </div>
              </Link>
            )
          })}
        </div>
      </section>

      <section>
        <div className="dashboard-section-header">
          <h2>Твой прогресс</h2>
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

            <div
              style={{
                flex: 1,
              }}
            >
              <strong>
                Отличный результат!
              </strong>

              <p
                style={{
                  margin: '5px 0 0',
                  color: '#718096',
                  fontSize: '13px',
                  lineHeight: 1.5,
                }}
              >
                За эту неделю ты выполнил 4 задания
                и получил 120 баллов.
              </p>
            </div>
          </div>
        </div>
      </section>

      <Link
        to="/notifications"
        className="content-card"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '14px',
        }}
      >
        <div className="dashboard-quick-icon">
          <MessageCircle size={23} />
        </div>

        <div
          style={{
            flex: 1,
          }}
        >
          <strong>
            Новые сообщения
          </strong>

          <p
            style={{
              margin: '5px 0 0',
              color: '#718096',
              fontSize: '13px',
            }}
          >
            У тебя есть непрочитанные уведомления
          </p>
        </div>

        <ChevronRight
          size={20}
          color="#94a3b8"
        />
      </Link>
    </div>
  )
}

export default DashboardPage