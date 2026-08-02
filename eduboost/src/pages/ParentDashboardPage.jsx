import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { getLevelByXp } from '../data/levels'
import {
  getUnlockedAchievements,
} from '../data/achievements'

import {
  calculateAttendance,
  calculateAverageGrade,
  claimParentReward,
  createParentReward,
  getLinkedStudents,
  getOverdueTasks,
  getParentRewards,
  getStudentAttendance,
  getStudentGrades,
  getStudentTasks,
  linkParentToStudent,
  removeParentLink,
} from '../services/parentService'

function ParentDashboardPage() {
  const { user } = useAuth()

  const [students, setStudents] =
    useState([])

  const [selectedStudentId,
    setSelectedStudentId] =
    useState('')

  const [studentCode, setStudentCode] =
    useState('')

  const [error, setError] =
    useState('')

  const [rewardForm, setRewardForm] =
    useState({
      title: '',
      description: '',
      requiredPoints: 500,
    })

  useEffect(() => {
    loadStudents()
  }, [user.id])

  function loadStudents() {
    const linkedStudents =
      getLinkedStudents(user.id)

    setStudents(linkedStudents)

    if (
      linkedStudents.length > 0 &&
      !selectedStudentId
    ) {
      setSelectedStudentId(
        linkedStudents[0].id,
      )
    }
  }

  function handleLinkStudent(event) {
    event.preventDefault()
    setError('')

    try {
      const student =
        linkParentToStudent(
          user,
          studentCode,
        )

      setStudentCode('')
      loadStudents()
      setSelectedStudentId(student.id)
    } catch (linkError) {
      setError(linkError.message)
    }
  }

  function unlinkStudent(studentId) {
    const confirmed = window.confirm(
      'Удалить привязку к ребёнку?',
    )

    if (!confirmed) {
      return
    }

    removeParentLink(
      user.id,
      studentId,
    )

    setSelectedStudentId('')
    loadStudents()
  }

  const student = students.find(
    (item) =>
      item.id === selectedStudentId,
  )

  if (!student) {
    return (
      <div className="page-container">
        <header className="page-header">
          <div>
            <h1>Родительский кабинет</h1>
            <p>
              Привяжите аккаунт ребёнка
            </p>
          </div>
        </header>

        <form
          className="content-card parent-link-card"
          onSubmit={handleLinkStudent}
        >
          <h2>Добавить ребёнка</h2>

          <p>
            Введите код, который отображается
            в профиле ученика.
          </p>

          {error && (
            <div className="auth-error">
              {error}
            </div>
          )}

          <div className="parent-link-row">
            <input
              value={studentCode}
              onChange={(event) =>
                setStudentCode(
                  event.target.value,
                )
              }
              placeholder="Например: EB-A12B34"
              required
            />

            <button
              className="primary-small-button"
              type="submit"
            >
              Привязать ребёнка
            </button>
          </div>
        </form>
      </div>
    )
  }

  const tasks =
    getStudentTasks(student)

  const overdueTasks =
    getOverdueTasks(student)

  const grades =
    getStudentGrades(student.id)

  const attendanceRecords =
    getStudentAttendance(student.id)

  const attendance =
    calculateAttendance(
      attendanceRecords,
    )

  const averageGrade =
    calculateAverageGrade(grades)

  const achievements =
    getUnlockedAchievements(student)

  const level =
    getLevelByXp(student.xp)

  const rewards =
    getParentRewards(
      user.id,
      student.id,
    )

  const classmates = JSON.parse(
    localStorage.getItem(
      'eduboost_users',
    ) || '[]',
  )
    .filter(
      (item) =>
        item.role === 'Ученик' &&
        item.school === student.school &&
        item.className ===
          student.className,
    )
    .sort(
      (a, b) =>
        Number(b.xp || 0) -
        Number(a.xp || 0),
    )

  const rankingPosition =
    classmates.findIndex(
      (item) =>
        item.id === student.id,
    ) + 1

  function handleRewardChange(event) {
    const { name, value } =
      event.target

    setRewardForm((oldForm) => ({
      ...oldForm,
      [name]: value,
    }))
  }

  function handleCreateReward(event) {
    event.preventDefault()

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

    setSelectedStudentId(
      student.id + '',
    )

    window.location.reload()
  }

  function handleClaimReward(reward) {
    if (
      Number(student.points || 0) <
      reward.requiredPoints
    ) {
      alert(
        'Ребёнок ещё не набрал нужное количество баллов',
      )
      return
    }

    claimParentReward(reward.id)
    window.location.reload()
  }

  return (
    <div className="page-container">
      <header className="page-header">
        <div>
          <h1>Родительский кабинет</h1>

          <p>
            Успеваемость и активность ребёнка
          </p>
        </div>

        <select
          className="parent-student-select"
          value={selectedStudentId}
          onChange={(event) =>
            setSelectedStudentId(
              event.target.value,
            )
          }
        >
          {students.map((item) => (
            <option
              key={item.id}
              value={item.id}
            >
              {item.name}
            </option>
          ))}
        </select>
      </header>

      <section className="parent-student-hero">
        <div className="parent-child-avatar">
          {student.name
            .charAt(0)
            .toUpperCase()}
        </div>

        <div>
          <span>Ваш ребёнок</span>
          <h2>{student.name}</h2>

          <p>
            {student.school} ·{' '}
            {student.className}
          </p>

          <strong>
            {level.icon} {level.name}
          </strong>
        </div>

        <button
          className="reject-button parent-unlink-button"
          onClick={() =>
            unlinkStudent(student.id)
          }
        >
          Удалить привязку
        </button>
      </section>

      <section className="parent-stats-grid">
        <Stat
          icon="⭐"
          value={student.points || 0}
          label="Баллов"
        />

        <Stat
          icon="⚡"
          value={student.xp || 0}
          label="Опыта"
        />

        <Stat
          icon="🔥"
          value={student.streak || 0}
          label="Дней серии"
        />

        <Stat
          icon="✅"
          value={
            student.completedTasks || 0
          }
          label="Заданий выполнено"
        />

        <Stat
          icon="🏆"
          value={achievements.length}
          label="Достижений"
        />

        <Stat
          icon="📊"
          value={
            rankingPosition || '—'
          }
          label="Место в классе"
        />
      </section>

      {overdueTasks.length > 0 && (
        <section className="parent-warning-card">
          <div className="parent-warning-icon">
            ⚠️
          </div>

          <div>
            <h2>
              Есть просроченные задания
            </h2>

            <p>
              Количество:{' '}
              {overdueTasks.length}
            </p>
          </div>
        </section>
      )}

      <section className="parent-main-grid">
        <div className="content-card">
          <h2>Задания ребёнка</h2>

          <div className="parent-task-list">
            {tasks.length === 0 && (
              <p className="empty-text">
                Заданий пока нет.
              </p>
            )}

            {tasks
              .slice()
              .reverse()
              .map((task) => (
                <div
                  className="parent-task-item"
                  key={task.id}
                >
                  <div>
                    <strong>
                      {task.title}
                    </strong>

                    <p>
                      {task.subject} · до{' '}
                      {task.deadline}
                    </p>
                  </div>

                  <TaskStatus
                    status={task.status}
                  />
                </div>
              ))}
          </div>
        </div>

        <div className="content-card">
          <h2>Учебные показатели</h2>

          <div className="parent-progress-item">
            <div>
              <span>
                Средняя оценка
              </span>

              <strong>
                {averageGrade || '—'}
              </strong>
            </div>
          </div>

          <div className="parent-progress-item">
            <div>
              <span>Посещаемость</span>

              <strong>
                {attendance.percent}%
              </strong>
            </div>

            <div className="parent-progress-track">
              <div
                style={{
                  width:
                    attendance.percent +
                    '%',
                }}
              />
            </div>
          </div>

          <div className="parent-attendance-details">
            <span>
              ✅ Присутствовал:{' '}
              {attendance.present}
            </span>

            <span>
              ❌ Отсутствовал:{' '}
              {attendance.absent}
            </span>

            <span>
              ⏰ Опоздал:{' '}
              {attendance.late}
            </span>
          </div>
        </div>
      </section>

      <section className="parent-main-grid">
        <div className="content-card">
          <h2>Последние оценки</h2>

          <div className="parent-grades-list">
            {grades.length === 0 && (
              <p className="empty-text">
                Оценок пока нет.
              </p>
            )}

            {grades
              .slice(0, 8)
              .map((grade) => (
                <div
                  className="parent-grade-item"
                  key={grade.id}
                >
                  <div>
                    <strong>
                      {grade.subject}
                    </strong>

                    <p>
                      {grade.date}
                      {grade.comment
                        ? ` · ${grade.comment}`
                        : ''}
                    </p>
                  </div>

                  <span
                    className={
                      Number(grade.value) >= 4
                        ? 'good-grade'
                        : 'bad-grade'
                    }
                  >
                    {grade.value}
                  </span>
                </div>
              ))}
          </div>
        </div>

        <div className="content-card">
          <h2>Достижения</h2>

          <div className="parent-achievements">
            {achievements.length ===
              0 && (
              <p className="empty-text">
                Достижений пока нет.
              </p>
            )}

            {achievements
              .slice(0, 6)
              .map((achievement) => (
                <div
                  key={achievement.id}
                >
                  <span>
                    {achievement.icon}
                  </span>

                  <strong>
                    {achievement.name}
                  </strong>
                </div>
              ))}
          </div>
        </div>
      </section>

      <section className="parent-main-grid">
        <form
          className="content-card"
          onSubmit={handleCreateReward}
        >
          <h2>
            Создать домашнюю награду
          </h2>

          <label className="form-group">
            <span>Название награды</span>

            <input
              name="title"
              value={rewardForm.title}
              onChange={
                handleRewardChange
              }
              placeholder="Например: поход в кино"
              required
            />
          </label>

          <label className="form-group">
            <span>Описание</span>

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

          <label className="form-group">
            <span>
              Необходимое количество баллов
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
            className="primary-button"
            type="submit"
          >
            Создать награду
          </button>
        </form>

        <div className="content-card">
          <h2>Домашние награды</h2>

          <div className="parent-rewards-list">
            {rewards.length === 0 && (
              <p className="empty-text">
                Наград пока нет.
              </p>
            )}

            {rewards.map((reward) => (
              <div
                className="parent-reward-item"
                key={reward.id}
              >
                <div>
                  <strong>
                    🎁 {reward.title}
                  </strong>

                  <p>
                    {reward.description}
                  </p>

                  <span>
                    Нужно ⭐{' '}
                    {reward.requiredPoints}
                  </span>
                </div>

                <button
                  className="primary-small-button"
                  disabled={
                    reward.claimed
                  }
                  onClick={() =>
                    handleClaimReward(
                      reward,
                    )
                  }
                >
                  {reward.claimed
                    ? 'Получено'
                    : 'Выдать награду'}
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}

function Stat({
  icon,
  value,
  label,
}) {
  return (
    <div className="parent-stat-card">
      <span>{icon}</span>
      <strong>{value}</strong>
      <p>{label}</p>
    </div>
  )
}

function TaskStatus({ status }) {
  const labels = {
    new: 'Не выполнено',
    pending: 'На проверке',
    approved: 'Принято',
    rejected: 'Исправить',
  }

  return (
    <span
      className={`task-status ${status}`}
    >
      {labels[status] || 'Не выполнено'}
    </span>
  )
}

export default ParentDashboardPage