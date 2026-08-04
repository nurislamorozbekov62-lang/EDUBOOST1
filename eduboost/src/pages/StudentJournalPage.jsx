import { useEffect, useMemo, useState } from 'react'
import {
  BarChart3,
  BookOpen,
  CalendarCheck2,
  CheckCircle2,
  Clock3,
  FileText,
  GraduationCap,
  School,
  Sparkles,
  TrendingUp,
  UserRound,
  XCircle,
} from 'lucide-react'

import { useAuth } from '../context/AuthContext'

import {
  calculateAttendanceStats,
  calculateAverageGrade,
  getStudentAttendance,
  getStudentGrades,
} from '../services/journalService'

function StudentJournalPage() {
  const { user } = useAuth()

  const [activeTab, setActiveTab] =
    useState('grades')

  const [refreshKey, setRefreshKey] =
    useState(0)

  useEffect(() => {
    if (!user?.id) {
      return
    }

    setRefreshKey((value) => value + 1)
  }, [user?.id])

  const grades = useMemo(() => {
    if (!user?.id) {
      return []
    }

    return getStudentGrades(user.id)
  }, [user?.id, refreshKey])

  const attendanceRecords = useMemo(() => {
    if (!user?.id) {
      return []
    }

    return getStudentAttendance(user.id)
  }, [user?.id, refreshKey])

  const averageGrade =
    calculateAverageGrade(grades)

  const attendance =
    calculateAttendanceStats(
      attendanceRecords,
    )

  const gradesBySubject = useMemo(() => {
    const subjects = {}

    grades.forEach((grade) => {
      if (!subjects[grade.subject]) {
        subjects[grade.subject] = []
      }

      subjects[grade.subject].push(
        Number(grade.value),
      )
    })

    return Object.entries(subjects)
      .map(([subject, values]) => {
        const sum = values.reduce(
          (total, value) =>
            total + value,
          0,
        )

        const average =
          values.length > 0
            ? Number(
                (
                  sum / values.length
                ).toFixed(2),
              )
            : 0

        return {
          subject,
          count: values.length,
          average,
        }
      })
      .sort(
        (
          firstSubject,
          secondSubject,
        ) =>
          secondSubject.average -
          firstSubject.average,
      )
  }, [grades])

  const excellentGrades =
    grades.filter(
      (grade) =>
        Number(grade.value) >= 5,
    ).length

  const goodGrades =
    grades.filter(
      (grade) =>
        Number(grade.value) === 4,
    ).length

  if (!user) {
    return null
  }

  if (user.role !== 'Ученик') {
    return (
      <div className="student-journal-page">
        <section className="student-journal-access">
          <div>
            <GraduationCap size={34} />
          </div>

          <h1>Доступ запрещён</h1>

          <p>
            Этот дневник предназначен
            только для ученика.
          </p>
        </section>
      </div>
    )
  }

  return (
    <div className="student-journal-page">
      <JournalHeader />

      <JournalHero
        user={user}
        averageGrade={averageGrade}
        attendancePercent={
          attendance.percent
        }
        gradesCount={grades.length}
      />

      <JournalStats
        averageGrade={averageGrade}
        gradesCount={grades.length}
        attendance={attendance}
        excellentGrades={
          excellentGrades
        }
      />

      <JournalTabs
        activeTab={activeTab}
        setActiveTab={setActiveTab}
      />

      {activeTab === 'grades' && (
        <GradesView
          grades={grades}
          gradesBySubject={
            gradesBySubject
          }
          averageGrade={
            averageGrade
          }
          excellentGrades={
            excellentGrades
          }
          goodGrades={goodGrades}
        />
      )}

      {activeTab ===
        'attendance' && (
        <AttendanceView
          records={
            attendanceRecords
          }
          attendance={attendance}
        />
      )}
    </div>
  )
}

function JournalHeader() {
  return (
    <header className="student-journal-header">
      <div className="student-journal-header-icon">
        <GraduationCap size={28} />
      </div>

      <div>
        <p>Учебные результаты</p>

        <h1>Мой дневник</h1>

        <span>
          Оценки, комментарии учителей,
          предметы и посещаемость.
        </span>
      </div>
    </header>
  )
}

function JournalHero({
  user,
  averageGrade,
  attendancePercent,
  gradesCount,
}) {
  return (
    <section className="student-journal-modern-hero">
      <div className="student-journal-modern-content">
        <div className="student-journal-modern-label">
          <Sparkles size={16} />
          Личный учебный профиль
        </div>

        <h2>{user.name}</h2>

        <p>
          Следите за оценками,
          посещаемостью и результатами
          по каждому предмету.
        </p>

        <div className="student-journal-modern-meta">
          <span>
            <School size={17} />
            {user.school ||
              'Школа не указана'}
          </span>

          <span>
            <UserRound size={17} />
            {user.className ||
              'Класс не указан'}
          </span>

          <span>
            <BookOpen size={17} />
            {gradesCount} оценок
          </span>
        </div>
      </div>

      <div className="student-journal-modern-badge">
        <div className="student-journal-modern-avatar">
          {String(user.name || 'У')
            .charAt(0)
            .toUpperCase()}
        </div>

        <strong>
          {averageGrade || '—'}
        </strong>

        <span>
          средняя оценка
        </span>

        <small>
          Посещаемость{' '}
          {attendancePercent}%
        </small>
      </div>
    </section>
  )
}

function JournalStats({
  averageGrade,
  gradesCount,
  attendance,
  excellentGrades,
}) {
  const stats = [
    {
      label: 'Средняя оценка',
      value:
        averageGrade || '—',
      icon: TrendingUp,
      className:
        'journal-modern-stat--blue',
    },
    {
      label: 'Всего оценок',
      value: gradesCount,
      icon: BookOpen,
      className:
        'journal-modern-stat--purple',
    },
    {
      label: 'Посещаемость',
      value: `${attendance.percent}%`,
      icon: CalendarCheck2,
      className:
        'journal-modern-stat--green',
    },
    {
      label: 'Отличных оценок',
      value: excellentGrades,
      icon: CheckCircle2,
      className:
        'journal-modern-stat--gold',
    },
    {
      label: 'Пропусков',
      value: attendance.absent,
      icon: XCircle,
      className:
        'journal-modern-stat--red',
    },
  ]

  return (
    <section className="student-journal-modern-stats">
      {stats.map((stat) => {
        const Icon = stat.icon

        return (
          <article
            className={`student-journal-modern-stat ${stat.className}`}
            key={stat.label}
          >
            <div>
              <Icon size={21} />
            </div>

            <span>
              <strong>
                {stat.value}
              </strong>

              <small>
                {stat.label}
              </small>
            </span>
          </article>
        )
      })}
    </section>
  )
}

function JournalTabs({
  activeTab,
  setActiveTab,
}) {
  return (
    <section className="student-journal-modern-tabs">
      <button
        type="button"
        className={
          activeTab === 'grades'
            ? 'student-journal-modern-tab student-journal-modern-tab--active'
            : 'student-journal-modern-tab'
        }
        onClick={() =>
          setActiveTab('grades')
        }
      >
        <BookOpen size={18} />
        Мои оценки
      </button>

      <button
        type="button"
        className={
          activeTab === 'attendance'
            ? 'student-journal-modern-tab student-journal-modern-tab--active'
            : 'student-journal-modern-tab'
        }
        onClick={() =>
          setActiveTab(
            'attendance',
          )
        }
      >
        <CalendarCheck2
          size={18}
        />
        Посещаемость
      </button>
    </section>
  )
}

function GradesView({
  grades,
  gradesBySubject,
  averageGrade,
  excellentGrades,
  goodGrades,
}) {
  return (
    <div className="student-journal-modern-grid">
      <section className="student-journal-modern-section">
        <div className="student-journal-modern-section-heading">
          <div>
            <p>Предметы</p>

            <h2>
              Средние оценки
            </h2>
          </div>

          <div className="student-journal-average-badge">
            {averageGrade || '—'}
          </div>
        </div>

        {gradesBySubject.length ===
        0 ? (
          <JournalEmpty
            icon={BookOpen}
            title="Оценок пока нет"
            text="Учитель пока не добавил оценки по предметам."
          />
        ) : (
          <div className="student-subject-list">
            {gradesBySubject.map(
              (item) => (
                <SubjectCard
                  key={item.subject}
                  item={item}
                />
              ),
            )}
          </div>
        )}
      </section>

      <section className="student-journal-modern-section">
        <div className="student-journal-modern-section-heading">
          <div>
            <p>Результаты</p>

            <h2>
              История оценок
            </h2>
          </div>

          <span className="student-journal-grade-summary">
            5: {excellentGrades} · 4:{' '}
            {goodGrades}
          </span>
        </div>

        {grades.length === 0 ? (
          <JournalEmpty
            icon={FileText}
            title="История пуста"
            text="Новые оценки появятся здесь после выставления учителем."
          />
        ) : (
          <div className="student-grade-history">
            {grades.map((grade) => (
              <GradeRecord
                key={grade.id}
                grade={grade}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

function SubjectCard({ item }) {
  const progress = Math.min(
    Math.max(
      (Number(item.average) / 5) *
        100,
      0,
    ),
    100,
  )

  return (
    <article className="student-subject-card">
      <div className="student-subject-card-top">
        <div>
          <strong>
            {item.subject}
          </strong>

          <span>
            Оценок: {item.count}
          </span>
        </div>

        <div
          className={`student-subject-grade ${getGradeClass(
            item.average,
          )}`}
        >
          {item.average}
        </div>
      </div>

      <div className="student-subject-progress">
        <span
          style={{
            width: `${progress}%`,
          }}
        />
      </div>

      <small>
        {getGradeDescription(
          item.average,
        )}
      </small>
    </article>
  )
}

function GradeRecord({ grade }) {
  return (
    <article className="student-grade-record-modern">
      <div
        className={`student-grade-value ${getGradeClass(
          Number(grade.value),
        )}`}
      >
        {grade.value}
      </div>

      <div className="student-grade-record-main">
        <div className="student-grade-record-title">
          <div>
            <h3>
              {grade.subject}
            </h3>

            <p>
              {grade.gradeType ||
                'Оценка'}{' '}
              · {formatDate(grade.date)}
            </p>
          </div>

          <span>
            {grade.teacherName ||
              'Учитель'}
          </span>
        </div>

        {grade.topic && (
          <div className="student-grade-topic">
            <BookOpen size={15} />

            <span>
              Тема: {grade.topic}
            </span>
          </div>
        )}

        {grade.comment && (
          <div className="student-grade-comment">
            <div>
              <FileText size={17} />
            </div>

            <span>
              <strong>
                Комментарий учителя
              </strong>

              <p>
                {grade.comment}
              </p>
            </span>
          </div>
        )}
      </div>
    </article>
  )
}

function AttendanceView({
  records,
  attendance,
}) {
  return (
    <div className="student-journal-modern-grid">
      <section className="student-journal-modern-section">
        <div className="student-journal-modern-section-heading">
          <div>
            <p>Статистика</p>

            <h2>
              Посещаемость
            </h2>
          </div>

          <div className="student-attendance-percent-badge">
            {attendance.percent}%
          </div>
        </div>

        <div className="student-attendance-modern-grid">
          <AttendanceCard
            icon={CheckCircle2}
            value={attendance.present}
            label="Присутствовал"
            className="attendance-modern--green"
          />

          <AttendanceCard
            icon={XCircle}
            value={attendance.absent}
            label="Отсутствовал"
            className="attendance-modern--red"
          />

          <AttendanceCard
            icon={Clock3}
            value={attendance.late}
            label="Опоздал"
            className="attendance-modern--orange"
          />

          <AttendanceCard
            icon={FileText}
            value={attendance.excused}
            label="Уважительная причина"
            className="attendance-modern--blue"
          />
        </div>

        <div className="student-attendance-overall">
          <div>
            <span>
              Общая посещаемость
            </span>

            <strong>
              {attendance.percent}%
            </strong>
          </div>

          <div>
            <span
              style={{
                width: `${attendance.percent}%`,
              }}
            />
          </div>
        </div>
      </section>

      <section className="student-journal-modern-section">
        <div className="student-journal-modern-section-heading">
          <div>
            <p>Посещения</p>

            <h2>
              История посещаемости
            </h2>
          </div>

          <span className="student-journal-grade-summary">
            Записей: {records.length}
          </span>
        </div>

        {records.length === 0 ? (
          <JournalEmpty
            icon={CalendarCheck2}
            title="Записей пока нет"
            text="Информация о посещаемости появится после отметки учителем."
          />
        ) : (
          <div className="student-attendance-history">
            {records.map(
              (record) => (
                <AttendanceRecord
                  key={record.id}
                  record={record}
                />
              ),
            )}
          </div>
        )}
      </section>
    </div>
  )
}

function AttendanceCard({
  icon: Icon,
  value,
  label,
  className,
}) {
  return (
    <article
      className={`student-attendance-modern-card ${className}`}
    >
      <div>
        <Icon size={21} />
      </div>

      <span>
        <strong>{value}</strong>
        <small>{label}</small>
      </span>
    </article>
  )
}

function AttendanceRecord({
  record,
}) {
  const status =
    getAttendanceData(
      record.status,
    )

  const Icon = status.icon

  return (
    <article className="student-attendance-record">
      <div
        className={`student-attendance-record-icon ${status.className}`}
      >
        <Icon size={21} />
      </div>

      <div className="student-attendance-record-main">
        <div>
          <h3>
            {record.subject}
          </h3>

          <span>
            {record.teacherName ||
              'Учитель'}
          </span>
        </div>

        <p>
          {status.label} ·{' '}
          {formatDate(record.date)}
        </p>

        {record.comment && (
          <div className="student-grade-comment">
            <div>
              <FileText size={17} />
            </div>

            <span>
              <strong>
                Комментарий учителя
              </strong>

              <p>
                {record.comment}
              </p>
            </span>
          </div>
        )}
      </div>
    </article>
  )
}

function JournalEmpty({
  icon: Icon,
  title,
  text,
}) {
  return (
    <div className="student-journal-empty">
      <div>
        <Icon size={30} />
      </div>

      <h3>{title}</h3>

      <p>{text}</p>
    </div>
  )
}

function getGradeClass(value) {
  const grade = Number(value)

  if (grade >= 4.5) {
    return 'grade-modern--excellent'
  }

  if (grade >= 3.5) {
    return 'grade-modern--good'
  }

  if (grade >= 2.5) {
    return 'grade-modern--normal'
  }

  return 'grade-modern--bad'
}

function getGradeDescription(
  value,
) {
  const grade = Number(value)

  if (grade >= 4.5) {
    return 'Отличный результат'
  }

  if (grade >= 3.5) {
    return 'Хороший результат'
  }

  if (grade >= 2.5) {
    return 'Можно улучшить'
  }

  return 'Нужно обратить внимание'
}

function getAttendanceData(status) {
  const values = {
    present: {
      label: 'Присутствовал',
      icon: CheckCircle2,
      className:
        'attendance-record--green',
    },
    absent: {
      label: 'Отсутствовал',
      icon: XCircle,
      className:
        'attendance-record--red',
    },
    late: {
      label: 'Опоздал',
      icon: Clock3,
      className:
        'attendance-record--orange',
    },
    excused: {
      label:
        'Уважительная причина',
      icon: FileText,
      className:
        'attendance-record--blue',
    },
  }

  return (
    values[status] || {
      label: 'Не указан',
      icon: CalendarCheck2,
      className:
        'attendance-record--blue',
    }
  )
}

function formatDate(date) {
  if (!date) {
    return 'Дата не указана'
  }

  const parsedDate = new Date(
    `${date}T12:00:00`,
  )

  if (
    Number.isNaN(
      parsedDate.getTime(),
    )
  ) {
    return 'Дата не указана'
  }

  return parsedDate.toLocaleDateString(
    'ru-RU',
    {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    },
  )
}

export default StudentJournalPage