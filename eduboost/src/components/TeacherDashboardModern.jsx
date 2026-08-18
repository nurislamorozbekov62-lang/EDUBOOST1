import {
  BookOpen,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  ClipboardCheck,
  ClipboardList,
  Clock3,
  GraduationCap,
  School,
  Send,
  Users,
} from 'lucide-react'

import { Link } from 'react-router-dom'

function TeacherDashboardModern({
  dashboard,
}) {
  const pendingSubmissions =
    dashboard?.pendingSubmissions || []

  const todayLessons =
    dashboard?.todayLessons || []

  const nextLesson =
    todayLessons[0] || null

  const quickActions = [
    {
      id: 'tasks',
      title: 'Задания',
      text: 'Создание и проверка работ',
      path: '/tasks',
      icon: ClipboardList,
      type: 'blue',
    },
    {
      id: 'schedule',
      title: 'Расписание',
      text: 'Уроки на сегодня',
      path: '/teacher-schedule',
      icon: CalendarDays,
      type: 'green',
    },
    {
      id: 'classes',
      title: 'Мои классы',
      text: 'Ученики и классы',
      path: '/classes',
      icon: Users,
      type: 'purple',
    },
    {
      id: 'journal',
      title: 'Журнал',
      text: 'Оценки и посещаемость',
      path: '/journals',
      icon: GraduationCap,
      type: 'orange',
    },
  ]

  return (
    <div className="eb-teacher-home">
      <section className="eb-teacher-stats">
        <Link
          to="/tasks"
          className="eb-teacher-stat-card"
        >
          <div className="eb-teacher-stat-icon eb-teacher-stat-blue">
            <ClipboardCheck size={21} />
          </div>

          <div>
            <strong>
              {pendingSubmissions.length}
            </strong>

            <span>
              На проверке
            </span>
          </div>
        </Link>

        <Link
          to="/teacher-schedule"
          className="eb-teacher-stat-card"
        >
          <div className="eb-teacher-stat-icon eb-teacher-stat-green">
            <CalendarDays size={21} />
          </div>

          <div>
            <strong>
              {todayLessons.length}
            </strong>

            <span>
              Уроков сегодня
            </span>
          </div>
        </Link>
      </section>

      <section className="eb-teacher-next">
        <div className="eb-teacher-next-top">
          <div>
            <span className="eb-teacher-next-label">
              <Clock3 size={15} />
              Ближайший урок
            </span>

            {nextLesson ? (
              <>
                <h2>
                  {nextLesson.subject ||
                    'Урок'}
                </h2>

                <p>
                  {nextLesson.className ||
                    'Класс не указан'}
                </p>
              </>
            ) : (
              <>
                <h2>
                  На сегодня всё
                </h2>

                <p>
                  В расписании нет уроков
                </p>
              </>
            )}
          </div>

          <div className="eb-teacher-next-art">
            <BookOpen size={38} />
          </div>
        </div>

        {nextLesson && (
          <div className="eb-teacher-next-bottom">
            <strong>
              {nextLesson.startTime || '—'}

              {nextLesson.endTime
                ? ` — ${nextLesson.endTime}`
                : ''}
            </strong>

            <Link to="/teacher-schedule">
              Расписание
              <ChevronRight size={16} />
            </Link>
          </div>
        )}
      </section>

      <section className="eb-teacher-section">
        <div className="eb-teacher-section-header">
          <div>
            <span>
              Инструменты
            </span>

            <h2>
              Быстрый доступ
            </h2>
          </div>
        </div>

        <div className="eb-teacher-actions">
          {quickActions.map(
            (action) => {
              const Icon =
                action.icon

              return (
                <Link
                  key={action.id}
                  to={action.path}
                  className="eb-teacher-action-card"
                >
                  <div
                    className={`eb-teacher-action-icon eb-teacher-action-${action.type}`}
                  >
                    <Icon size={22} />
                  </div>

                  <strong>
                    {action.title}
                  </strong>

                  <span>
                    {action.text}
                  </span>

                  <ChevronRight
                    size={16}
                    className="eb-teacher-action-arrow"
                  />
                </Link>
              )
            }
          )}
        </div>
      </section>

      <section className="eb-teacher-section">
        <div className="eb-teacher-section-header">
          <div>
            <span>
              Требует внимания
            </span>

            <h2>
              Работы учеников
            </h2>
          </div>

          <Link to="/tasks">
            Все работы
          </Link>
        </div>

        {pendingSubmissions.length === 0 ? (
          <TeacherEmpty
            icon={CheckCircle2}
            title="Всё проверено"
            text="Новых работ учеников сейчас нет."
          />
        ) : (
          <div className="eb-teacher-work-list">
            {pendingSubmissions
              .slice(0, 4)
              .map(
                (submission) => (
                  <Link
                    key={submission.id}
                    to="/tasks"
                    className="eb-teacher-work-row"
                  >
                    <div className="eb-teacher-avatar">
                      {(
                        submission.studentName ||
                        'У'
                      )
                        .charAt(0)
                        .toUpperCase()}
                    </div>

                    <div className="eb-teacher-work-info">
                      <strong>
                        {submission.studentName ||
                          'Ученик'}
                      </strong>

                      <span>
                        {submission.taskTitle ||
                          'Задание'}
                      </span>

                      <small>
                        {submission.className ||
                          'Класс не указан'}
                      </small>
                    </div>

                    <div className="eb-teacher-work-status">
                      Проверить
                    </div>

                    <ChevronRight
                      size={17}
                    />
                  </Link>
                )
              )}
          </div>
        )}
      </section>

      <section className="eb-teacher-section">
        <div className="eb-teacher-section-header">
          <div>
            <span>
              Учебный день
            </span>

            <h2>
              Сегодняшние уроки
            </h2>
          </div>

          <Link to="/teacher-schedule">
            Все уроки
          </Link>
        </div>

        {todayLessons.length === 0 ? (
          <TeacherEmpty
            icon={School}
            title="Уроков сегодня нет"
            text="После добавления расписания уроки появятся здесь."
          />
        ) : (
          <div className="eb-teacher-lessons">
            {todayLessons
              .slice(0, 4)
              .map(
                (lesson) => (
                  <Link
                    key={lesson.id}
                    to="/teacher-schedule"
                    className="eb-teacher-lesson"
                  >
                    <div className="eb-teacher-lesson-time">
                      <strong>
                        {lesson.startTime ||
                          '—'}
                      </strong>

                      <span>
                        {lesson.endTime ||
                          ''}
                      </span>
                    </div>

                    <div className="eb-teacher-lesson-info">
                      <strong>
                        {lesson.subject ||
                          'Урок'}
                      </strong>

                      <span>
                        {lesson.className ||
                          'Класс'}
                      </span>
                    </div>

                    <div className="eb-teacher-lesson-number">
                      №
                      {lesson.lessonNumber ||
                        '—'}
                    </div>
                  </Link>
                )
              )}
          </div>
        )}
      </section>
    </div>
  )
}

function TeacherEmpty({
  icon: Icon,
  title,
  text,
}) {
  return (
    <div className="eb-teacher-empty">
      <div className="eb-teacher-empty-icon">
        <Icon size={24} />
      </div>

      <div>
        <strong>{title}</strong>
        <p>{text}</p>
      </div>
    </div>
  )
}

export default TeacherDashboardModern