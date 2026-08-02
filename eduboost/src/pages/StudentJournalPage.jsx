import { useEffect, useMemo, useState } from 'react'
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
    setRefreshKey((value) => value + 1)
  }, [user.id])

  const grades = useMemo(
    () => getStudentGrades(user.id),
    [user.id, refreshKey],
  )

  const attendanceRecords = useMemo(
    () => getStudentAttendance(user.id),
    [user.id, refreshKey],
  )

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
          (total, value) => total + value,
          0,
        )

        return {
          subject,
          count: values.length,
          average: Number(
            (sum / values.length).toFixed(2),
          ),
        }
      })
      .sort(
        (firstSubject, secondSubject) =>
          secondSubject.average -
          firstSubject.average,
      )
  }, [grades])

  if (user.role !== 'Ученик') {
    return (
      <div className="page-container">
        <section className="content-card">
          <h2>Доступ запрещён</h2>

          <p>
            Этот дневник предназначен для
            ученика.
          </p>
        </section>
      </div>
    )
  }

  return (
    <div className="page-container">
      <header className="page-header">
        <div>
          <h1>Мой дневник</h1>

          <p>
            Оценки, комментарии учителей и
            посещаемость
          </p>
        </div>
      </header>

      <section className="student-journal-hero">
        <div className="student-journal-avatar">
          {user.name
            .charAt(0)
            .toUpperCase()}
        </div>

        <div>
          <span>Ученик</span>

          <h2>{user.name}</h2>

          <p>
            {user.school} · {user.className}
          </p>
        </div>
      </section>

      <section className="student-journal-stats">
        <JournalStat
          icon="📘"
          value={averageGrade || '—'}
          label="Средняя оценка"
        />

        <JournalStat
          icon="✅"
          value={grades.length}
          label="Всего оценок"
        />

        <JournalStat
          icon="📊"
          value={`${attendance.percent}%`}
          label="Посещаемость"
        />

        <JournalStat
          icon="❌"
          value={attendance.absent}
          label="Пропусков"
        />

        <JournalStat
          icon="⏰"
          value={attendance.late}
          label="Опозданий"
        />
      </section>

      <div className="journal-tabs">
        <button
          type="button"
          className={
            activeTab === 'grades'
              ? 'journal-tab active'
              : 'journal-tab'
          }
          onClick={() =>
            setActiveTab('grades')
          }
        >
          📘 Мои оценки
        </button>

        <button
          type="button"
          className={
            activeTab === 'attendance'
              ? 'journal-tab active'
              : 'journal-tab'
          }
          onClick={() =>
            setActiveTab('attendance')
          }
        >
          📅 Моя посещаемость
        </button>
      </div>

      {activeTab === 'grades' && (
        <GradesView
          grades={grades}
          gradesBySubject={gradesBySubject}
          averageGrade={averageGrade}
        />
      )}

      {activeTab === 'attendance' && (
        <AttendanceView
          records={attendanceRecords}
          attendance={attendance}
        />
      )}
    </div>
  )
}

function JournalStat({
  icon,
  value,
  label,
}) {
  return (
    <div className="student-journal-stat">
      <span>{icon}</span>

      <strong>{value}</strong>

      <p>{label}</p>
    </div>
  )
}

function GradesView({
  grades,
  gradesBySubject,
  averageGrade,
}) {
  return (
    <div className="student-journal-grid">
      <section className="content-card">
        <div className="student-journal-section-head">
          <div>
            <h2>Оценки по предметам</h2>

            <p>
              Средний балл по каждому предмету
            </p>
          </div>

          <div className="journal-average">
            {averageGrade || '—'}
          </div>
        </div>

        <div className="subject-average-list">
          {gradesBySubject.length === 0 && (
            <p className="empty-text">
              Учитель пока не поставил оценок.
            </p>
          )}

          {gradesBySubject.map((item) => (
            <div
              className="subject-average-item"
              key={item.subject}
            >
              <div>
                <strong>{item.subject}</strong>

                <p>
                  Оценок: {item.count}
                </p>
              </div>

              <span
                className={
                  item.average >= 4
                    ? 'subject-average good'
                    : item.average >= 3
                      ? 'subject-average normal'
                      : 'subject-average bad'
                }
              >
                {item.average}
              </span>
            </div>
          ))}
        </div>
      </section>

      <section className="content-card">
        <h2>История оценок</h2>

        <div className="journal-records">
          {grades.length === 0 && (
            <p className="empty-text">
              Оценок пока нет.
            </p>
          )}

          {grades.map((grade) => (
            <article
              className="journal-record student-grade-record"
              key={grade.id}
            >
              <div
                className={`journal-grade grade-${grade.value}`}
              >
                {grade.value}
              </div>

              <div className="journal-record-main">
                <strong>
                  {grade.subject}
                </strong>

                <p>
                  {grade.gradeType} ·{' '}
                  {formatDate(grade.date)}
                </p>

                {grade.topic && (
                  <span>
                    Тема: {grade.topic}
                  </span>
                )}

                {grade.comment && (
                  <div className="student-teacher-comment">
                    <strong>
                      Комментарий учителя:
                    </strong>

                    <p>{grade.comment}</p>
                  </div>
                )}

                <span>
                  Учитель:{' '}
                  {grade.teacherName}
                </span>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  )
}

function AttendanceView({
  records,
  attendance,
}) {
  return (
    <div className="student-journal-grid">
      <section className="content-card">
        <h2>Статистика посещаемости</h2>

        <div className="student-attendance-cards">
          <AttendanceCard
            icon="✅"
            value={attendance.present}
            label="Присутствовал"
          />

          <AttendanceCard
            icon="❌"
            value={attendance.absent}
            label="Отсутствовал"
          />

          <AttendanceCard
            icon="⏰"
            value={attendance.late}
            label="Опоздал"
          />

          <AttendanceCard
            icon="📄"
            value={attendance.excused}
            label="Уважительная причина"
          />
        </div>

        <div className="student-attendance-percent">
          <div>
            <span>Общая посещаемость</span>

            <strong>
              {attendance.percent}%
            </strong>
          </div>

          <div className="attendance-progress">
            <div
              style={{
                width: `${attendance.percent}%`,
              }}
            />
          </div>
        </div>
      </section>

      <section className="content-card">
        <h2>История посещений</h2>

        <div className="journal-records">
          {records.length === 0 && (
            <p className="empty-text">
              Записей о посещении пока нет.
            </p>
          )}

          {records.map((record) => (
            <article
              className="journal-record"
              key={record.id}
            >
              <div className="attendance-status-icon">
                {getAttendanceIcon(
                  record.status,
                )}
              </div>

              <div className="journal-record-main">
                <strong>
                  {record.subject}
                </strong>

                <p>
                  {getAttendanceLabel(
                    record.status,
                  )}{' '}
                  · {formatDate(record.date)}
                </p>

                {record.comment && (
                  <div className="student-teacher-comment">
                    <strong>
                      Комментарий учителя:
                    </strong>

                    <p>
                      {record.comment}
                    </p>
                  </div>
                )}

                <span>
                  Учитель:{' '}
                  {record.teacherName}
                </span>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  )
}

function AttendanceCard({
  icon,
  value,
  label,
}) {
  return (
    <div className="student-attendance-card">
      <span>{icon}</span>

      <strong>{value}</strong>

      <p>{label}</p>
    </div>
  )
}

function getAttendanceIcon(status) {
  const icons = {
    present: '✅',
    absent: '❌',
    late: '⏰',
    excused: '📄',
  }

  return icons[status] || '📅'
}

function getAttendanceLabel(status) {
  const labels = {
    present: 'Присутствовал',
    absent: 'Отсутствовал',
    late: 'Опоздал',
    excused: 'Уважительная причина',
  }

  return labels[status] || 'Не указан'
}

function formatDate(date) {
  if (!date) {
    return ''
  }

  return new Date(
    `${date}T12:00:00`,
  ).toLocaleDateString('ru-RU')
}

export default StudentJournalPage