import {
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  Clock3,
  GraduationCap,
  School,
  Send,
} from 'lucide-react'
import { Link } from 'react-router-dom'

function TeacherDashboardModern({ dashboard }) {
  const pendingSubmissions =
    dashboard?.pendingSubmissions || []

  const todayLessons =
    dashboard?.todayLessons || []

  const quickActions = [
    {
      id: 'tasks',
      title: 'Задания',
      text: 'Создание и проверка работ',
      path: '/tasks',
      icon: ClipboardList,
    },
    {
      id: 'schedule',
      title: 'Расписание',
      text: 'Уроки и учебный день',
      path: '/schedule',
      icon: CalendarDays,
    },
    {
      id: 'classes',
      title: 'Мои классы',
      text: 'Ученики вашей школы',
      path: '/classes',
      icon: School,
    },
    {
      id: 'journal',
      title: 'Журнал',
      text: 'Оценки и посещаемость',
      path: '/journals',
      icon: GraduationCap,
    },
  ]

  return (
    <>
      <style>{`
        .teacher-modern {
          display: grid;
          gap: 24px;
        }

        .teacher-modern * {
          box-sizing: border-box;
        }

        .teacher-modern-overview {
          display: grid;
          grid-template-columns: minmax(0, 1.4fr) minmax(280px, 0.6fr);
          gap: 18px;
        }

        .teacher-modern-main-card {
          min-width: 0;
          padding: 24px;
          border: 1px solid #dbeafe;
          border-radius: 24px;
          background:
            radial-gradient(
              circle at 90% 15%,
              rgba(96, 165, 250, 0.22),
              transparent 35%
            ),
            linear-gradient(
              135deg,
              #eff6ff 0%,
              #ffffff 70%
            );
        }

        .teacher-modern-main-top {
          display: flex;
          align-items: flex-start;
          gap: 15px;
        }

        .teacher-modern-main-icon {
          width: 52px;
          height: 52px;
          flex: 0 0 52px;
          display: grid;
          place-items: center;
          border-radius: 16px;
          color: #ffffff;
          background: #2563eb;
          box-shadow:
            0 10px 25px rgba(37, 99, 235, 0.24);
        }

        .teacher-modern-eyebrow {
          display: block;
          margin-bottom: 5px;
          color: #64748b;
          font-size: 12px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.04em;
        }

        .teacher-modern-main-card h2 {
          margin: 0;
          color: #102343;
          font-size: 24px;
          line-height: 1.2;
        }

        .teacher-modern-main-card p {
          max-width: 600px;
          margin: 8px 0 0;
          color: #64748b;
          font-size: 14px;
          line-height: 1.6;
        }

        .teacher-modern-summary {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 12px;
          margin-top: 22px;
        }

        .teacher-modern-summary-card {
          display: flex;
          align-items: center;
          gap: 12px;
          min-width: 0;
          padding: 15px;
          border: 1px solid #e2e8f0;
          border-radius: 17px;
          color: inherit;
          text-decoration: none;
          background: rgba(255,255,255,0.82);
          transition:
            transform 0.18s ease,
            border-color 0.18s ease;
        }

        .teacher-modern-summary-card:hover {
          transform: translateY(-2px);
          border-color: #93c5fd;
        }

        .teacher-modern-summary-icon {
          width: 40px;
          height: 40px;
          flex: 0 0 40px;
          display: grid;
          place-items: center;
          border-radius: 12px;
          color: #2563eb;
          background: #eff6ff;
        }

        .teacher-modern-summary-card strong {
          display: block;
          color: #102343;
          font-size: 20px;
          line-height: 1;
        }

        .teacher-modern-summary-card span {
          display: block;
          margin-top: 4px;
          color: #64748b;
          font-size: 12px;
        }

        .teacher-modern-next-card {
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          padding: 22px;
          border-radius: 24px;
          color: #ffffff;
          background:
            linear-gradient(
              145deg,
              #1769e8 0%,
              #1255c5 100%
            );
          box-shadow:
            0 16px 35px rgba(37, 99, 235, 0.18);
        }

        .teacher-modern-next-label {
          display: flex;
          align-items: center;
          gap: 8px;
          color: rgba(255,255,255,0.75);
          font-size: 12px;
          font-weight: 800;
        }

        .teacher-modern-next-card h3 {
          margin: 18px 0 5px;
          font-size: 21px;
        }

        .teacher-modern-next-card p {
          margin: 0;
          color: rgba(255,255,255,0.8);
          font-size: 13px;
        }

        .teacher-modern-next-time {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-top: 25px;
          font-size: 15px;
          font-weight: 800;
        }

        .teacher-modern-section {
          min-width: 0;
        }

        .teacher-modern-section-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 14px;
          margin-bottom: 13px;
        }

        .teacher-modern-section-header h2 {
          margin: 0;
          color: #102343;
          font-size: 20px;
        }

        .teacher-modern-section-header span {
          display: block;
          margin-bottom: 3px;
          color: #94a3b8;
          font-size: 11px;
          font-weight: 800;
          text-transform: uppercase;
        }

        .teacher-modern-section-header > a {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          color: #2563eb;
          font-size: 13px;
          font-weight: 800;
          text-decoration: none;
          white-space: nowrap;
        }

        .teacher-modern-quick {
          display: grid;
          grid-template-columns:
            repeat(4, minmax(0, 1fr));
          gap: 12px;
        }

        .teacher-modern-quick-card {
          min-width: 0;
          padding: 18px;
          border: 1px solid #e5edf6;
          border-radius: 20px;
          color: inherit;
          text-decoration: none;
          background: #ffffff;
          transition:
            transform 0.18s ease,
            box-shadow 0.18s ease,
            border-color 0.18s ease;
        }

        .teacher-modern-quick-card:hover {
          transform: translateY(-2px);
          border-color: #bfdbfe;
          box-shadow:
            0 10px 25px rgba(15,23,42,0.06);
        }

        .teacher-modern-quick-icon {
          width: 43px;
          height: 43px;
          display: grid;
          place-items: center;
          margin-bottom: 13px;
          border-radius: 13px;
          color: #2563eb;
          background: #eff6ff;
        }

        .teacher-modern-quick-card strong {
          display: block;
          color: #102343;
          font-size: 15px;
        }

        .teacher-modern-quick-card p {
          margin: 5px 0 0;
          color: #7b8da4;
          font-size: 12px;
          line-height: 1.45;
        }

        .teacher-modern-grid {
          display: grid;
          grid-template-columns:
            repeat(2, minmax(0, 1fr));
          gap: 18px;
        }

        .teacher-modern-panel {
          min-width: 0;
          padding: 20px;
          border: 1px solid #e5edf6;
          border-radius: 22px;
          background: #ffffff;
        }

        .teacher-modern-panel-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          margin-bottom: 14px;
        }

        .teacher-modern-panel-header h2 {
          margin: 0;
          color: #102343;
          font-size: 18px;
        }

        .teacher-modern-panel-header a {
          display: inline-flex;
          align-items: center;
          gap: 3px;
          color: #2563eb;
          font-size: 12px;
          font-weight: 800;
          text-decoration: none;
        }

        .teacher-modern-list {
          display: grid;
          gap: 9px;
        }

        .teacher-modern-row {
          display: flex;
          align-items: center;
          gap: 11px;
          min-width: 0;
          padding: 12px;
          border: 1px solid #edf2f7;
          border-radius: 15px;
          color: inherit;
          text-decoration: none;
          background: #fbfdff;
        }

        .teacher-modern-row-icon {
          width: 40px;
          height: 40px;
          flex: 0 0 40px;
          display: grid;
          place-items: center;
          border-radius: 12px;
          color: #2563eb;
          background: #eff6ff;
        }

        .teacher-modern-row-body {
          flex: 1;
          min-width: 0;
        }

        .teacher-modern-row-body strong {
          display: block;
          overflow: hidden;
          color: #102343;
          font-size: 14px;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .teacher-modern-row-body span {
          display: block;
          margin-top: 3px;
          overflow: hidden;
          color: #64748b;
          font-size: 12px;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .teacher-modern-row-body small {
          display: block;
          margin-top: 4px;
          color: #94a3b8;
          font-size: 11px;
        }

        .teacher-modern-status {
          flex-shrink: 0;
          padding: 6px 8px;
          border-radius: 9px;
          color: #b45309;
          background: #fff7ed;
          font-size: 10px;
          font-weight: 800;
        }

        .teacher-modern-lesson-time {
          width: 62px;
          flex: 0 0 62px;
          text-align: center;
        }

        .teacher-modern-lesson-time strong {
          display: block;
          color: #2563eb;
          font-size: 14px;
        }

        .teacher-modern-lesson-time span {
          display: block;
          margin-top: 2px;
          color: #94a3b8;
          font-size: 10px;
        }

        .teacher-modern-empty {
          display: flex;
          align-items: center;
          gap: 13px;
          min-height: 120px;
          padding: 17px;
          border: 1px dashed #d8e2ee;
          border-radius: 17px;
          background: #fbfdff;
        }

        .teacher-modern-empty-icon {
          width: 44px;
          height: 44px;
          flex: 0 0 44px;
          display: grid;
          place-items: center;
          border-radius: 14px;
          color: #16a34a;
          background: #ecfdf5;
        }

        .teacher-modern-empty strong {
          color: #102343;
          font-size: 14px;
        }

        .teacher-modern-empty p {
          margin: 4px 0 0;
          color: #7b8da4;
          font-size: 12px;
          line-height: 1.5;
        }

        @media (max-width: 900px) {
          .teacher-modern-overview {
            grid-template-columns: 1fr;
          }

          .teacher-modern-next-card {
            min-height: 180px;
          }

          .teacher-modern-quick {
            grid-template-columns:
              repeat(2, minmax(0, 1fr));
          }

          .teacher-modern-grid {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 520px) {
          .teacher-modern {
            gap: 18px;
          }

          .teacher-modern-main-card {
            padding: 17px;
            border-radius: 20px;
          }

          .teacher-modern-main-top {
            gap: 11px;
          }

          .teacher-modern-main-icon {
            width: 44px;
            height: 44px;
            flex-basis: 44px;
            border-radius: 13px;
          }

          .teacher-modern-main-card h2 {
            font-size: 19px;
          }

          .teacher-modern-main-card p {
            font-size: 13px;
          }

          .teacher-modern-summary {
            grid-template-columns: 1fr;
            margin-top: 17px;
          }

          .teacher-modern-next-card {
            min-height: 160px;
            padding: 18px;
            border-radius: 20px;
          }

          .teacher-modern-quick {
            grid-template-columns:
              repeat(2, minmax(0, 1fr));
            gap: 9px;
          }

          .teacher-modern-quick-card {
            padding: 14px;
            border-radius: 17px;
          }

          .teacher-modern-quick-icon {
            width: 39px;
            height: 39px;
            margin-bottom: 10px;
          }

          .teacher-modern-panel {
            padding: 14px;
            border-radius: 18px;
          }

          .teacher-modern-status {
            display: none;
          }

          .teacher-modern-row {
            padding: 10px;
          }

          .teacher-modern-section-header h2 {
            font-size: 18px;
          }
        }
      `}</style>

      <div className="teacher-modern">
        <section className="teacher-modern-overview">
          <article className="teacher-modern-main-card">
            <div className="teacher-modern-main-top">
              <div className="teacher-modern-main-icon">
                <CheckCircle2 size={25} />
              </div>

              <div>
                <span className="teacher-modern-eyebrow">
                  Рабочий день
                </span>

                <h2>
                  {pendingSubmissions.length > 0
                    ? `${pendingSubmissions.length} работ ждут проверки`
                    : 'Все работы проверены'}
                </h2>

                <p>
                  {pendingSubmissions.length > 0
                    ? 'Проверьте новые работы учеников и продолжайте вести учебный процесс.'
                    : 'Новых работ сейчас нет. Можно перейти к журналу или расписанию.'}
                </p>
              </div>
            </div>

            <div className="teacher-modern-summary">
              <Link
                to="/tasks"
                className="teacher-modern-summary-card"
              >
                <div className="teacher-modern-summary-icon">
                  <Send size={19} />
                </div>

                <div>
                  <strong>
                    {pendingSubmissions.length}
                  </strong>
                  <span>Работ на проверке</span>
                </div>
              </Link>

              <Link
                to="/schedule"
                className="teacher-modern-summary-card"
              >
                <div className="teacher-modern-summary-icon">
                  <CalendarDays size={19} />
                </div>

                <div>
                  <strong>
                    {todayLessons.length}
                  </strong>
                  <span>Уроков сегодня</span>
                </div>
              </Link>
            </div>
          </article>

          <article className="teacher-modern-next-card">
            <div>
              <div className="teacher-modern-next-label">
                <CalendarDays size={16} />
                Ближайший урок
              </div>

              {todayLessons.length > 0 ? (
                <>
                  <h3>
                    {todayLessons[0].subject ||
                      'Урок'}
                  </h3>

                  <p>
                    {todayLessons[0].className ||
                      'Класс не указан'}
                  </p>
                </>
              ) : (
                <>
                  <h3>Сегодня свободно</h3>
                  <p>
                    В расписании на сегодня уроков нет.
                  </p>
                </>
              )}
            </div>

            {todayLessons.length > 0 && (
              <div className="teacher-modern-next-time">
                <Clock3 size={18} />

                {todayLessons[0].startTime ||
                  '—'}

                {todayLessons[0].endTime
                  ? ` — ${todayLessons[0].endTime}`
                  : ''}
              </div>
            )}
          </article>
        </section>

        <section className="teacher-modern-section">
          <div className="teacher-modern-section-header">
            <div>
              <span>Инструменты</span>
              <h2>Быстрый доступ</h2>
            </div>
          </div>

          <div className="teacher-modern-quick">
            {quickActions.map((action) => {
              const Icon = action.icon

              return (
                <Link
                  key={action.id}
                  to={action.path}
                  className="teacher-modern-quick-card"
                >
                  <div className="teacher-modern-quick-icon">
                    <Icon size={21} />
                  </div>

                  <strong>{action.title}</strong>
                  <p>{action.text}</p>
                </Link>
              )
            })}
          </div>
        </section>

        <div className="teacher-modern-grid">
          <section className="teacher-modern-panel">
            <div className="teacher-modern-panel-header">
              <h2>Работы на проверке</h2>

              <Link to="/tasks">
                Все
                <ChevronRight size={15} />
              </Link>
            </div>

            {pendingSubmissions.length === 0 ? (
              <div className="teacher-modern-empty">
                <div className="teacher-modern-empty-icon">
                  <CheckCircle2 size={23} />
                </div>

                <div>
                  <strong>
                    Всё проверено
                  </strong>

                  <p>
                    Новые работы учеников появятся
                    здесь автоматически.
                  </p>
                </div>
              </div>
            ) : (
              <div className="teacher-modern-list">
                {pendingSubmissions
                  .slice(0, 4)
                  .map((submission) => (
                    <Link
                      key={submission.id}
                      to="/tasks"
                      className="teacher-modern-row"
                    >
                      <div className="teacher-modern-row-icon">
                        <Send size={19} />
                      </div>

                      <div className="teacher-modern-row-body">
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

                      <span className="teacher-modern-status">
                        На проверке
                      </span>

                      <ChevronRight
                        size={17}
                        color="#94a3b8"
                      />
                    </Link>
                  ))}
              </div>
            )}
          </section>

          <section className="teacher-modern-panel">
            <div className="teacher-modern-panel-header">
              <h2>Сегодняшние уроки</h2>

              <Link to="/schedule">
                Все
                <ChevronRight size={15} />
              </Link>
            </div>

            {todayLessons.length === 0 ? (
              <div className="teacher-modern-empty">
                <div className="teacher-modern-empty-icon">
                  <CalendarDays size={23} />
                </div>

                <div>
                  <strong>
                    Уроков сегодня нет
                  </strong>

                  <p>
                    Уроки появятся после добавления
                    расписания.
                  </p>
                </div>
              </div>
            ) : (
              <div className="teacher-modern-list">
                {todayLessons
                  .slice(0, 4)
                  .map((lesson) => (
                    <Link
                      key={lesson.id}
                      to="/schedule"
                      className="teacher-modern-row"
                    >
                      <div className="teacher-modern-lesson-time">
                        <strong>
                          {lesson.startTime || '—'}
                        </strong>

                        <span>
                          {lesson.endTime || ''}
                        </span>
                      </div>

                      <div className="teacher-modern-row-body">
                        <strong>
                          {lesson.subject ||
                            'Урок'}
                        </strong>

                        <span>
                          {lesson.className ||
                            'Класс'}
                        </span>

                        <small>
                          Урок №
                          {lesson.lessonNumber ||
                            '—'}
                        </small>
                      </div>

                      <ChevronRight
                        size={17}
                        color="#94a3b8"
                      />
                    </Link>
                  ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </>
  )
}

export default TeacherDashboardModern