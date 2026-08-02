
import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'

import {
  createNotification,
  createNotificationsForUsers,
  getParentsForStudent,
} from '../services/notificationService'

import {
  createTask,
  deleteTask,
  getStudentSubmission,
  getTasksForStudent,
  getTasksForTeacher,
  getTeacherSubmissions,
  submitTask,
  updateSubmissionStatus,
} from '../services/taskService'

function TasksPage() {
  const { user } = useAuth()

  const [tasks, setTasks] = useState([])
  const [submissions, setSubmissions] = useState([])

  const [selectedTask, setSelectedTask] = useState(null)
  const [reportText, setReportText] = useState('')
  const [teacherComments, setTeacherComments] = useState({})

  const [form, setForm] = useState({
    title: '',
    subject: '',
    description: '',
    className: '6 класс',
    deadline: '',
    reward: 50,
    affectsStreak: true,
  })

  useEffect(() => {
    loadData()
  }, [user])

  function loadData() {
    if (user.role === 'Учитель') {
      setTasks(getTasksForTeacher(user))
      setSubmissions(getTeacherSubmissions(user))
      return
    }

    if (user.role === 'Ученик') {
      setTasks(getTasksForStudent(user))
      setSubmissions([])
      return
    }

    setTasks([])
    setSubmissions([])
  }

  function handleFormChange(event) {
    const { name, value, type, checked } = event.target

    setForm((previousForm) => ({
      ...previousForm,
      [name]: type === 'checkbox' ? checked : value,
    }))
  }

  function handleCreateTask(event) {
    event.preventDefault()

    createTask(form, user)

    setForm({
      title: '',
      subject: '',
      description: '',
      className: '6 класс',
      deadline: '',
      reward: 50,
      affectsStreak: true,
    })

    loadData()
  }

  function handleDeleteTask(taskId) {
    const confirmed = window.confirm(
      'Удалить это задание и все отчёты к нему?',
    )

    if (!confirmed) {
      return
    }

    deleteTask(taskId)
    loadData()
  }

  function openReportModal(task) {
    const oldSubmission = getStudentSubmission(
      task.id,
      user.id,
    )

    setSelectedTask(task)
    setReportText(oldSubmission?.reportText || '')
  }

  function closeReportModal() {
    setSelectedTask(null)
    setReportText('')
  }

  function handleSubmitReport(event) {
    event.preventDefault()

    if (!selectedTask) {
      return
    }

    if (!reportText.trim()) {
      alert('Напишите отчёт о выполненной работе')
      return
    }

    submitTask(selectedTask, user, reportText)

    closeReportModal()
    loadData()
  }

  function getTeacherComment(submissionId) {
    return teacherComments[submissionId] || ''
  }

  function changeTeacherComment(
    submissionId,
    value,
  ) {
    setTeacherComments((previousComments) => ({
      ...previousComments,
      [submissionId]: value,
    }))
  }

  function clearTeacherComment(submissionId) {
    setTeacherComments((previousComments) => {
      const updatedComments = {
        ...previousComments,
      }

      delete updatedComments[submissionId]

      return updatedComments
    })
  }

  function handleApprove(submission) {
    const allSubmissions = JSON.parse(
      localStorage.getItem(
        'eduboost_submissions',
      ) || '[]',
    )
createNotification({
  userId: submission.studentId,
  title: 'Работа принята',
  message: `Задание «${submission.taskTitle}» принято. Начислено ${submission.taskReward} баллов.`,
  type: 'approved',
  link: '/tasks',
})

createNotificationsForUsers(
  getParentsForStudent(
    submission.studentId,
  ),
  {
    title: 'Работа ребёнка принята',
    message: `${submission.studentName} успешно выполнил задание «${submission.taskTitle}».`,
    type: 'approved',
    link: '/',
  },
)
    const storedSubmission = allSubmissions.find(
      (item) => item.id === submission.id,
    )

    const rewardWasAlreadyGiven =
      storedSubmission?.rewardGiven === true

    updateSubmissionStatus(
      
      submission.id,
      'approved',
      getTeacherComment(submission.id),
    )
    createNotification({
  userId: submission.studentId,
  title: 'Работа возвращена',
  message: `Задание «${submission.taskTitle}» нужно исправить.`,
  type: 'rejected',
  link: '/tasks',
})

createNotificationsForUsers(
  getParentsForStudent(
    submission.studentId,
  ),
  {
    title: 'Работа ребёнка возвращена',
    message: `${submission.studentName} должен исправить задание «${submission.taskTitle}».`,
    type: 'rejected',
    link: '/',
  },
)
    if (!rewardWasAlreadyGiven) {
      giveRewardToStudent(submission)
      markRewardAsGiven(submission.id)
    }

    clearTeacherComment(submission.id)
    loadData()
  }

  function handleReject(submission) {
    updateSubmissionStatus(
      submission.id,
      'rejected',
      getTeacherComment(submission.id),
    )

    clearTeacherComment(submission.id)
    loadData()
  }

  function giveRewardToStudent(submission) {
    const allUsers = JSON.parse(
      localStorage.getItem(
        'eduboost_users',
      ) || '[]',
    )

    const student = allUsers.find(
      (item) => item.id === submission.studentId,
    )

    if (!student) {
      return
    }

    const reward = Number(
      submission.taskReward || 0,
    )

    const today = new Date()
      .toISOString()
      .slice(0, 10)

    const streakData = calculateStreak(
      student,
      today,
      submission.affectsStreak,
    )

    const updatedStudent = {
      ...student,
      points: Number(student.points || 0) + reward,
      xp: Number(student.xp || 0) + reward,
      completedTasks:
        Number(student.completedTasks || 0) + 1,
      streak: streakData.streak,
      bestStreak: Math.max(
        Number(student.bestStreak || 0),
        streakData.streak,
      ),
      lastActivityDate:
        streakData.lastActivityDate,
    }

    const updatedUsers = allUsers.map(
      (existingUser) =>
        existingUser.id === student.id
          ? updatedStudent
          : existingUser,
    )

    localStorage.setItem(
      'eduboost_users',
      JSON.stringify(updatedUsers),
    )
  }

  function calculateStreak(
    student,
    today,
    affectsStreak,
  ) {
    const oldStreak = Number(
      student.streak || 0,
    )

    if (!affectsStreak) {
      return {
        streak: oldStreak,
        lastActivityDate:
          student.lastActivityDate || '',
      }
    }

    const lastDate =
      student.lastActivityDate || ''

    if (!lastDate) {
      return {
        streak: 1,
        lastActivityDate: today,
      }
    }

    if (lastDate === today) {
      return {
        streak: oldStreak,
        lastActivityDate: today,
      }
    }

    const difference = Math.floor(
      (new Date(`${today}T12:00:00`) -
        new Date(`${lastDate}T12:00:00`)) /
        86400000,
    )

    if (difference === 1) {
      return {
        streak: oldStreak + 1,
        lastActivityDate: today,
      }
    }

    return {
      streak: 1,
      lastActivityDate: today,
    }
  }

  function markRewardAsGiven(submissionId) {
    const allSubmissions = JSON.parse(
      localStorage.getItem(
        'eduboost_submissions',
      ) || '[]',
    )

    const updatedSubmissions =
      allSubmissions.map((submission) =>
        submission.id === submissionId
          ? {
              ...submission,
              rewardGiven: true,
            }
          : submission,
      )

    localStorage.setItem(
      'eduboost_submissions',
      JSON.stringify(updatedSubmissions),
    )
  }

  function getStatusText(status) {
    const statuses = {
      new: 'Не выполнено',
      pending: 'На проверке',
      approved: 'Принято',
      rejected: 'Нужно исправить',
    }

    return statuses[status] || 'Не выполнено'
  }

  function getStudentTaskData(task) {
    const submission = getStudentSubmission(
      task.id,
      user.id,
    )

    return {
      status: submission?.status || 'new',
      teacherComment:
        submission?.teacherComment || '',
      reportText: submission?.reportText || '',
    }
  }

  if (user.role === 'Родитель') {
    return (
      <div className="page-container">
        <header className="page-header">
          <div>
            <h1>Задания ребёнка</h1>

            <p>
              Просмотр домашних заданий и
              результатов ребёнка
            </p>
          </div>
        </header>

        <section className="content-card">
          <h2>Родительский кабинет</h2>

          <p className="empty-text">
            Сначала нужно добавить привязку
            родителя к аккаунту ученика.
          </p>
        </section>
      </div>
    )
  }

  return (
    <div className="page-container">
      <header className="page-header">
        <div>
          <h1>
            {user.role === 'Учитель'
              ? 'Задания'
              : 'Мои задания'}
          </h1>

          <p>
            Создание, выполнение и проверка
            домашних заданий
          </p>
        </div>
      </header>

      {user.role === 'Учитель' && (
        <TeacherTaskCreator
          form={form}
          handleChange={handleFormChange}
          handleSubmit={handleCreateTask}
        />
      )}

      {user.role === 'Учитель' && (
        <>
          <TeacherTasksList
            tasks={tasks}
            handleDeleteTask={handleDeleteTask}
          />

          <TeacherSubmissionsList
            submissions={submissions}
            getStatusText={getStatusText}
            comments={teacherComments}
            changeComment={changeTeacherComment}
            approve={handleApprove}
            reject={handleReject}
          />
        </>
      )}

      {user.role === 'Ученик' && (
        <StudentTasksList
          tasks={tasks}
          getTaskData={getStudentTaskData}
          getStatusText={getStatusText}
          openReportModal={openReportModal}
        />
      )}

      {selectedTask && (
        <ReportModal
          task={selectedTask}
          reportText={reportText}
          setReportText={setReportText}
          submit={handleSubmitReport}
          close={closeReportModal}
        />
      )}
    </div>
  )
}

function TeacherTaskCreator({
  form,
  handleChange,
  handleSubmit,
}) {
  return (
    <form
      className="content-card task-create-form"
      onSubmit={handleSubmit}
    >
      <h2>Создать новое задание</h2>

      <div className="form-grid">
        <label className="form-group">
          <span>Название задания</span>

          <input
            name="title"
            value={form.title}
            onChange={handleChange}
            placeholder="Например: Квадратные уравнения"
            required
          />
        </label>

        <label className="form-group">
          <span>Предмет</span>

          <select
            name="subject"
            value={form.subject}
            onChange={handleChange}
            required
          >
            <option value="">
              Выберите предмет
            </option>
            <option value="Математика">
              Математика
            </option>
            <option value="Английский язык">
              Английский язык
            </option>
            <option value="Информатика">
              Информатика
            </option>
            <option value="Кыргызский язык">
              Кыргызский язык
            </option>
            <option value="Русский язык">
              Русский язык
            </option>
            <option value="История">
              История
            </option>
            <option value="Физика">
              Физика
            </option>
            <option value="Биология">
              Биология
            </option>
            <option value="Другое">
              Другое
            </option>
          </select>
        </label>

        <label className="form-group">
          <span>Класс</span>

          <select
            name="className"
            value={form.className}
            onChange={handleChange}
          >
            <option value="6 класс">
              6 класс
            </option>
            <option value="7 класс">
              7 класс
            </option>
            <option value="8 класс">
              8 класс
            </option>
            <option value="9 класс">
              9 класс
            </option>
            <option value="10 класс">
              10 класс
            </option>
            <option value="11 класс">
              11 класс
            </option>
          </select>
        </label>

        <label className="form-group">
          <span>Срок выполнения</span>

          <input
            type="date"
            name="deadline"
            value={form.deadline}
            onChange={handleChange}
            required
          />
        </label>

        <label className="form-group">
          <span>Баллы и опыт</span>

          <input
            type="number"
            name="reward"
            value={form.reward}
            onChange={handleChange}
            min="1"
            max="1000"
            required
          />
        </label>

        <label className="checkbox-group">
          <input
            type="checkbox"
            name="affectsStreak"
            checked={form.affectsStreak}
            onChange={handleChange}
          />

          <span>Задание влияет на серию</span>
        </label>
      </div>

      <label className="form-group">
        <span>Описание задания</span>

        <textarea
          name="description"
          value={form.description}
          onChange={handleChange}
          placeholder="Подробно опишите, что должен выполнить ученик"
          required
        />
      </label>

      <button
        className="primary-button task-create-button"
        type="submit"
      >
        Создать задание
      </button>
    </form>
  )
}

function TeacherTasksList({
  tasks,
  handleDeleteTask,
}) {
  return (
    <section className="content-card">
      <h2>Созданные задания</h2>

      <div className="tasks-list">
        {tasks.length === 0 && (
          <p className="empty-text">
            Вы пока не создали ни одного
            задания.
          </p>
        )}

        {tasks.map((task) => (
          <article
            className="task-item"
            key={task.id}
          >
            <div className="task-main">
              <div>
                <span className="task-subject">
                  {task.subject}
                </span>

                <h3>{task.title}</h3>

                <p>{task.description}</p>

                <div className="task-meta">
                  <span>
                    🏫 {task.className}
                  </span>

                  <span>
                    📅 До {task.deadline}
                  </span>

                  <span>
                    ⭐ {task.reward} баллов
                  </span>

                  <span>
                    🔥{' '}
                    {task.affectsStreak
                      ? 'Влияет на серию'
                      : 'Не влияет на серию'}
                  </span>
                </div>
              </div>
            </div>

            <div className="task-actions">
              <button
                type="button"
                className="reject-button"
                onClick={() =>
                  handleDeleteTask(task.id)
                }
              >
                Удалить задание
              </button>
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}

function TeacherSubmissionsList({
  submissions,
  getStatusText,
  comments,
  changeComment,
  approve,
  reject,
}) {
  return (
    <section
      className="content-card"
      style={{ marginTop: '22px' }}
    >
      <h2>Отчёты учеников</h2>

      <div className="tasks-list">
        {submissions.length === 0 && (
          <p className="empty-text">
            Ученики пока не отправили отчёты.
          </p>
        )}

        {submissions
          .slice()
          .reverse()
          .map((submission) => (
            <article
              className="task-item"
              key={submission.id}
            >
              <div className="task-main">
                <div>
                  <span className="task-subject">
                    {submission.className}
                  </span>

                  <h3>
                    {submission.taskTitle}
                  </h3>

                  <p>
                    Ученик:{' '}
                    <strong>
                      {submission.studentName}
                    </strong>
                  </p>

                  <div className="report-box">
                    {submission.reportText}
                  </div>
                </div>

                <span
                  className={`task-status ${submission.status}`}
                >
                  {getStatusText(
                    submission.status,
                  )}
                </span>
              </div>

              {submission.teacherComment && (
                <div className="teacher-comment">
                  <strong>
                    Комментарий учителя:
                  </strong>{' '}
                  {submission.teacherComment}
                </div>
              )}

              {submission.status ===
                'pending' && (
                <>
                  <label
                    className="form-group"
                    style={{ marginTop: '16px' }}
                  >
                    <span>
                      Комментарий ученику
                    </span>

                    <textarea
                      value={
                        comments[
                          submission.id
                        ] || ''
                      }
                      onChange={(event) =>
                        changeComment(
                          submission.id,
                          event.target.value,
                        )
                      }
                      placeholder="Можно оставить рекомендацию или объяснить ошибку"
                    />
                  </label>

                  <div className="task-actions">
                    <button
                      type="button"
                      className="approve-button"
                      onClick={() =>
                        approve(submission)
                      }
                    >
                      Принять работу
                    </button>

                    <button
                      type="button"
                      className="reject-button"
                      onClick={() =>
                        reject(submission)
                      }
                    >
                      Вернуть на исправление
                    </button>
                  </div>
                </>
              )}
            </article>
          ))}
      </div>
    </section>
  )
}

function StudentTasksList({
  tasks,
  getTaskData,
  getStatusText,
  openReportModal,
}) {
  return (
    <section className="content-card">
      <h2>Задания моего класса</h2>

      <div className="tasks-list">
        {tasks.length === 0 && (
          <p className="empty-text">
            Учитель пока не создал заданий для
            вашего класса.
          </p>
        )}

        {tasks
          .slice()
          .reverse()
          .map((task) => {
            const taskData = getTaskData(task)

            return (
              <article
                className="task-item"
                key={task.id}
              >
                <div className="task-main">
                  <div>
                    <span className="task-subject">
                      {task.subject}
                    </span>

                    <h3>{task.title}</h3>

                    <p>{task.description}</p>

                    <div className="task-meta">
                      <span>
                        📅 До {task.deadline}
                      </span>

                      <span>
                        ⭐ {task.reward} баллов
                      </span>

                      <span>
                        🔥{' '}
                        {task.affectsStreak
                          ? 'Влияет на серию'
                          : 'Дополнительное'}
                      </span>
                    </div>
                  </div>

                  <span
                    className={`task-status ${taskData.status}`}
                  >
                    {getStatusText(
                      taskData.status,
                    )}
                  </span>
                </div>

                {taskData.reportText && (
                  <div className="report-box">
                    <strong>
                      Ваш отчёт:
                    </strong>{' '}
                    {taskData.reportText}
                  </div>
                )}

                {taskData.teacherComment && (
                  <div className="teacher-comment">
                    <strong>
                      Комментарий учителя:
                    </strong>{' '}
                    {
                      taskData.teacherComment
                    }
                  </div>
                )}

                {(taskData.status === 'new' ||
                  taskData.status ===
                    'rejected') && (
                  <div className="task-actions">
                    <button
                      type="button"
                      className="primary-small-button"
                      onClick={() =>
                        openReportModal(task)
                      }
                    >
                      {taskData.status ===
                      'rejected'
                        ? 'Исправить отчёт'
                        : 'Отправить отчёт'}
                    </button>
                  </div>
                )}
              </article>
            )
          })}
      </div>
    </section>
  )
}

function ReportModal({
  task,
  reportText,
  setReportText,
  submit,
  close,
}) {
  return (
    <div className="task-modal">
      <form
        className="task-modal-card"
        onSubmit={submit}
      >
        <h2>Отправить отчёт</h2>

        <p>
          Задание: <strong>{task.title}</strong>
        </p>

        <label className="form-group">
          <span>Отчёт о выполнении</span>

          <textarea
            value={reportText}
            onChange={(event) =>
              setReportText(event.target.value)
            }
            placeholder="Напишите, что вы выполнили и какой результат получили"
            required
          />
        </label>

        <div className="task-actions">
          <button
            className="primary-small-button"
            type="submit"
          >
            Отправить учителю
          </button>

          <button
            className="reject-button"
            type="button"
            onClick={close}
          >
            Отмена
          </button>
        </div>
      </form>
    </div>
  )
}

export default TasksPage