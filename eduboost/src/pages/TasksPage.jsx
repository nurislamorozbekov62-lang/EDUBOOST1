import { useEffect, useMemo, useState } from 'react'
import {
  Award,
  BookOpen,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronDown,
  ClipboardList,
  Clock3,
  Edit3,
  FileText,
  Flame,
  GraduationCap,
  Plus,
  RotateCcw,
  Send,
  Sparkles,
  Trash2,
  UserRound,
  X,
} from 'lucide-react'

import { useAuth } from '../context/AuthContext'

import {
  createNotification,
  createNotificationsForUsers,
  getParentsForStudent,
} from '../services/notificationService'

import {
  createSupabaseTask,
  deleteSupabaseTask,
  getSupabaseStudentSubmissions,
  getSupabaseTasksForStudent,
  getSupabaseTasksForTeacher,
  getSupabaseTeacherSubmissions,
  reviewSupabaseSubmission,
  submitSupabaseTask,
} from '../services/supabaseTaskService'

const INITIAL_FORM = {
  title: '',
  subject: '',
  description: '',
  className: '6 класс',
  deadline: '',
  reward: 50,
  affectsStreak: true,
}

function TasksPage() {
  const { user } = useAuth()

  const [tasks, setTasks] = useState([])
  const [submissions, setSubmissions] = useState([])

  const [selectedTask, setSelectedTask] = useState(null)
  const [reportText, setReportText] = useState('')
  const [teacherComments, setTeacherComments] = useState({})

  const [form, setForm] = useState(INITIAL_FORM)

  const [studentFilter, setStudentFilter] =
    useState('active')

  useEffect(() => {
    void loadData()
  }, [user])

  async function loadData() {
    if (!user) {
      setTasks([])
      setSubmissions([])
      return
    }

    try {
      if (user.role === 'Учитель') {
        const [
          teacherTasks,
          teacherSubmissions,
        ] = await Promise.all([
          getSupabaseTasksForTeacher(user),
          getSupabaseTeacherSubmissions(
            user.id,
          ),
        ])

        setTasks(teacherTasks)
        setSubmissions(
          teacherSubmissions,
        )
        return
      }

      if (user.role === 'Ученик') {
        const [
          studentTasks,
          studentSubmissions,
        ] = await Promise.all([
          getSupabaseTasksForStudent(user),
          getSupabaseStudentSubmissions(
            user.id,
          ),
        ])

        setTasks(studentTasks)
        setSubmissions(
          studentSubmissions,
        )
        return
      }

      setTasks([])
      setSubmissions([])
    } catch (error) {
      console.error(
        'Ошибка загрузки заданий:',
        error,
      )

      setTasks([])
      setSubmissions([])

      window.alert(
        error.message ||
          'Не удалось загрузить задания',
      )
    }
  }

  function handleFormChange(event) {
    const {
      name,
      value,
      type,
      checked,
    } = event.target

    setForm((previousForm) => ({
      ...previousForm,
      [name]:
        type === 'checkbox'
          ? checked
          : value,
    }))
  }

  async function handleCreateTask(event) {
    event.preventDefault()

    try {
      await createSupabaseTask(form, user)
      setForm(INITIAL_FORM)
      await loadData()
    } catch (error) {
      window.alert(
        error.message ||
          'Не удалось создать задание',
      )
    }
  }

  async function handleDeleteTask(taskId) {
    const confirmed = window.confirm(
      'Удалить это задание и все отчёты к нему?',
    )

    if (!confirmed) {
      return
    }

    try {
      await deleteSupabaseTask(taskId)
      await loadData()
    } catch (error) {
      window.alert(
        error.message ||
          'Не удалось удалить задание',
      )
    }
  }

  function openReportModal(task) {
    const oldSubmission =
      submissions.find(
        (submission) =>
          submission.taskId === task.id &&
          submission.studentId === user.id,
      )

    setSelectedTask(task)
    setReportText(
      oldSubmission?.reportText || '',
    )
  }

  function closeReportModal() {
    setSelectedTask(null)
    setReportText('')
  }

  async function handleSubmitReport(event) {
    event.preventDefault()

    if (!selectedTask) {
      return
    }

    if (!reportText.trim()) {
      window.alert(
        'Напишите отчёт о выполненной работе',
      )
      return
    }

    try {
      await submitSupabaseTask(
        selectedTask,
        user,
        reportText.trim(),
      )

      closeReportModal()
      await loadData()
    } catch (error) {
      window.alert(
        error.message ||
          'Не удалось отправить отчёт',
      )
    }
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

  async function handleApprove(submission) {
    try {
      await reviewSupabaseSubmission(
        submission.id,
        'approved',
        getTeacherComment(submission.id),
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

      clearTeacherComment(submission.id)
      await loadData()
    } catch (error) {
      window.alert(
        error.message ||
          'Не удалось принять работу',
      )
    }
  }

  async function handleReject(submission) {
    try {
      await reviewSupabaseSubmission(
        submission.id,
        'rejected',
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
          title:
            'Работа ребёнка возвращена',
          message: `${submission.studentName} должен исправить задание «${submission.taskTitle}».`,
          type: 'rejected',
          link: '/',
        },
      )

      clearTeacherComment(submission.id)
      await loadData()
    } catch (error) {
      window.alert(
        error.message ||
          'Не удалось вернуть работу',
      )
    }
  }

  function getStatusText(status) {
    const statuses = {
      new: 'Не выполнено',
      pending: 'На проверке',
      approved: 'Принято',
      rejected: 'Нужно исправить',
    }

    return (
      statuses[status] || 'Не выполнено'
    )
  }

  function getStudentTaskData(task) {
    const submission =
      submissions.find(
        (item) =>
          item.taskId === task.id &&
          item.studentId === user.id,
      )

    return {
      status:
        submission?.status || 'new',
      teacherComment:
        submission?.teacherComment || '',
      reportText:
        submission?.reportText || '',
    }
  }

  if (!user) {
    return null
  }

  if (user.role === 'Родитель') {
    return <ParentTasksView />
  }

  return (
    <div className="tasks-page">
      <TasksHero role={user.role} />

      {user.role === 'Учитель' && (
        <>
          <TeacherTaskCreator
            form={form}
            handleChange={handleFormChange}
            handleSubmit={handleCreateTask}
          />

          <TeacherTasksList
            tasks={tasks}
            handleDeleteTask={
              handleDeleteTask
            }
          />

          <TeacherSubmissionsList
            submissions={submissions}
            getStatusText={getStatusText}
            comments={teacherComments}
            changeComment={
              changeTeacherComment
            }
            approve={handleApprove}
            reject={handleReject}
          />
        </>
      )}

      {user.role === 'Ученик' && (
        <StudentTasksList
          tasks={tasks}
          filter={studentFilter}
          setFilter={setStudentFilter}
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

function TasksHero({ role }) {
  return (
    <header className="tasks-hero">
      <div className="tasks-hero-icon">
        <ClipboardList size={28} />
      </div>

      <div>
        <p className="tasks-hero-label">
          Учебный процесс
        </p>

        <h1>
          {role === 'Учитель'
            ? 'Управление заданиями'
            : 'Домашние задания и работы'}
        </h1>

        <p>
          {role === 'Учитель'
            ? 'Создавайте задания, проверяйте отчёты и отслеживайте результаты учеников.'
            : 'Выполняйте задания, отправляйте отчёты и получайте баллы за результат.'}
        </p>
      </div>
    </header>
  )
}

function ParentTasksView() {
  return (
    <div className="tasks-page">
      <TasksHero role="Родитель" />

      <section className="task-empty-card">
        <div className="task-empty-icon">
          <UserRound size={30} />
        </div>

        <h2>Задания ребёнка</h2>

        <p>
          Сначала добавьте привязку к аккаунту
          ученика в родительском кабинете.
        </p>
      </section>
    </div>
  )
}

function TeacherTaskCreator({
  form,
  handleChange,
  handleSubmit,
}) {
  const [isOpen, setIsOpen] = useState(true)

  return (
    <section className="teacher-create-section">
      <button
        type="button"
        className="tasks-section-toggle"
        onClick={() =>
          setIsOpen((previous) => !previous)
        }
      >
        <span>
          <Plus size={20} />
          Создать новое задание
        </span>

        <ChevronDown
          size={20}
          className={
            isOpen
              ? 'tasks-chevron tasks-chevron--open'
              : 'tasks-chevron'
          }
        />
      </button>

      {isOpen && (
        <form
          className="teacher-task-form"
          onSubmit={handleSubmit}
        >
          <div className="task-form-grid">
            <label className="task-field">
              <span>Название задания</span>

              <input
                name="title"
                value={form.title}
                onChange={handleChange}
                placeholder="Например: Квадратные уравнения"
                required
              />
            </label>

            <label className="task-field">
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

            <label className="task-field">
              <span>Класс</span>

              <select
                name="className"
                value={form.className}
                onChange={handleChange}
              >
                {[6, 7, 8, 9, 10, 11].map(
                  (grade) => (
                    <option
                      key={grade}
                      value={`${grade} класс`}
                    >
                      {grade} класс
                    </option>
                  ),
                )}
              </select>
            </label>

            <label className="task-field">
              <span>Срок выполнения</span>

              <input
                type="date"
                name="deadline"
                value={form.deadline}
                onChange={handleChange}
                required
              />
            </label>

            <label className="task-field">
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

            <label className="task-checkbox-card">
              <input
                type="checkbox"
                name="affectsStreak"
                checked={form.affectsStreak}
                onChange={handleChange}
              />

              <span className="task-checkbox-icon">
                <Flame size={19} />
              </span>

              <span>
                <strong>
                  Влияет на серию
                </strong>

                <small>
                  Увеличивает количество дней
                  активности
                </small>
              </span>
            </label>
          </div>

          <label className="task-field">
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
            className="primary-button task-submit-button"
            type="submit"
          >
            <Plus size={19} />
            Создать задание
          </button>
        </form>
      )}
    </section>
  )
}

function TeacherTasksList({
  tasks,
  handleDeleteTask,
}) {
  return (
    <section className="tasks-section">
      <div className="tasks-section-heading">
        <div>
          <p>Материалы для класса</p>
          <h2>Созданные задания</h2>
        </div>

        <span className="tasks-count">
          {tasks.length}
        </span>
      </div>

      {tasks.length === 0 ? (
        <TaskEmptyState
          icon={ClipboardList}
          title="Заданий пока нет"
          text="Создайте первое задание для своего класса."
        />
      ) : (
        <div className="modern-task-list">
          {tasks
            .slice()
            .reverse()
            .map((task) => (
              <article
                className="modern-task-card teacher-task-card"
                key={task.id}
              >
                <div className="modern-task-top">
                  <SubjectIcon
                    subject={task.subject}
                  />

                  <div className="modern-task-main">
                    <div className="modern-task-title-row">
                      <div>
                        <span className="modern-task-subject">
                          {task.subject}
                        </span>

                        <h3>{task.title}</h3>
                      </div>

                      <button
                        type="button"
                        className="task-icon-danger"
                        onClick={() =>
                          handleDeleteTask(
                            task.id,
                          )
                        }
                        aria-label="Удалить задание"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>

                    <p className="modern-task-description">
                      {task.description}
                    </p>

                    <div className="modern-task-meta">
                      <span>
                        <GraduationCap size={16} />
                        {task.className}
                      </span>

                      <span>
                        <CalendarDays size={16} />
                        До{' '}
                        {formatTaskDate(
                          task.deadline,
                        )}
                      </span>

                      <span>
                        <Award size={16} />
                        {task.reward} баллов
                      </span>

                      <span>
                        <Flame size={16} />
                        {task.affectsStreak
                          ? 'Влияет на серию'
                          : 'Дополнительное'}
                      </span>
                    </div>
                  </div>
                </div>
              </article>
            ))}
        </div>
      )}
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
    <section className="tasks-section">
      <div className="tasks-section-heading">
        <div>
          <p>Проверка результатов</p>
          <h2>Отчёты учеников</h2>
        </div>

        <span className="tasks-count">
          {submissions.length}
        </span>
      </div>

      {submissions.length === 0 ? (
        <TaskEmptyState
          icon={FileText}
          title="Отчётов пока нет"
          text="Отправленные учениками работы появятся здесь."
        />
      ) : (
        <div className="modern-task-list">
          {submissions
            .slice()
            .reverse()
            .map((submission) => (
              <article
                className="modern-task-card submission-card"
                key={submission.id}
              >
                <div className="modern-task-top">
                  <div className="submission-avatar">
                    {(
                      submission.studentName ||
                      'У'
                    )
                      .charAt(0)
                      .toUpperCase()}
                  </div>

                  <div className="modern-task-main">
                    <div className="modern-task-title-row">
                      <div>
                        <span className="modern-task-subject">
                          {submission.className}
                        </span>

                        <h3>
                          {submission.taskTitle}
                        </h3>

                        <p className="submission-student-name">
                          <UserRound size={15} />
                          {submission.studentName}
                        </p>
                      </div>

                      <TaskStatus
                        status={
                          submission.status
                        }
                        text={getStatusText(
                          submission.status,
                        )}
                      />
                    </div>

                    <div className="task-report-box">
                      <div>
                        <FileText size={17} />
                        Отчёт ученика
                      </div>

                      <p>
                        {submission.reportText}
                      </p>
                    </div>

                    {submission.teacherComment && (
                      <div className="task-teacher-note">
                        <strong>
                          Комментарий учителя
                        </strong>

                        <p>
                          {
                            submission.teacherComment
                          }
                        </p>
                      </div>
                    )}

                    {submission.status ===
                      'pending' && (
                      <div className="submission-review">
                        <label className="task-field">
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
                                event.target
                                  .value,
                              )
                            }
                            placeholder="Оставьте рекомендацию или объясните ошибку"
                          />
                        </label>

                        <div className="submission-actions">
                          <button
                            type="button"
                            className="task-approve-button"
                            onClick={() =>
                              approve(submission)
                            }
                          >
                            <Check size={18} />
                            Принять работу
                          </button>

                          <button
                            type="button"
                            className="task-reject-button"
                            onClick={() =>
                              reject(submission)
                            }
                          >
                            <RotateCcw size={18} />
                            Вернуть
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </article>
            ))}
        </div>
      )}
    </section>
  )
}

function StudentTasksList({
  tasks,
  filter,
  setFilter,
  getTaskData,
  getStatusText,
  openReportModal,
}) {
  const preparedTasks = useMemo(
    () =>
      tasks
        .slice()
        .reverse()
        .map((task) => ({
          ...task,
          taskData: getTaskData(task),
        })),
    [tasks, getTaskData],
  )

  const activeTasks = preparedTasks.filter(
    (task) =>
      task.taskData.status !== 'approved',
  )

  const completedTasks =
    preparedTasks.filter(
      (task) =>
        task.taskData.status === 'approved',
    )

  const visibleTasks =
    filter === 'completed'
      ? completedTasks
      : activeTasks

  return (
    <>
      <section className="task-filter-panel">
        <button
          type="button"
          className={
            filter === 'active'
              ? 'task-filter-button task-filter-button--active'
              : 'task-filter-button'
          }
          onClick={() =>
            setFilter('active')
          }
        >
          Активные
          <span>{activeTasks.length}</span>
        </button>

        <button
          type="button"
          className={
            filter === 'completed'
              ? 'task-filter-button task-filter-button--active'
              : 'task-filter-button'
          }
          onClick={() =>
            setFilter('completed')
          }
        >
          Завершённые
          <span>{completedTasks.length}</span>
        </button>
      </section>

      <section className="student-tasks-section">
        {visibleTasks.length === 0 ? (
          <TaskEmptyState
            icon={
              filter === 'completed'
                ? CheckCircle2
                : ClipboardList
            }
            title={
              filter === 'completed'
                ? 'Нет завершённых заданий'
                : 'Активных заданий нет'
            }
            text={
              filter === 'completed'
                ? 'Выполненные задания появятся здесь после проверки учителем.'
                : 'Учитель пока не добавил новых заданий.'
            }
          />
        ) : (
          <div className="student-modern-task-list">
            {visibleTasks.map((task) => (
              <StudentTaskCard
                key={task.id}
                task={task}
                taskData={task.taskData}
                getStatusText={
                  getStatusText
                }
                openReportModal={
                  openReportModal
                }
              />
            ))}
          </div>
        )}
      </section>
    </>
  )
}

function StudentTaskCard({
  task,
  taskData,
  getStatusText,
  openReportModal,
}) {
  const isApproved =
    taskData.status === 'approved'

  const isPending =
    taskData.status === 'pending'

  const isRejected =
    taskData.status === 'rejected'

  return (
    <article
      className={`student-modern-task-card student-modern-task-card--${taskData.status}`}
    >
      <div className="student-task-card-header">
        <SubjectIcon subject={task.subject} />

        <div className="modern-task-main">
          <div className="modern-task-title-row">
            <div>
              <span className="modern-task-subject">
                {task.subject}
              </span>

              <h3>{task.title}</h3>
            </div>

            <TaskStatus
              status={taskData.status}
              text={getStatusText(
                taskData.status,
              )}
            />
          </div>

          <p className="modern-task-description">
            {task.description}
          </p>
        </div>
      </div>

      <div className="student-task-info-grid">
        <div className="student-task-info">
          <CalendarDays size={18} />

          <span>
            <small>Срок сдачи</small>
            <strong>
              {formatTaskDate(
                task.deadline,
              )}
            </strong>
          </span>
        </div>

        <div className="student-task-info">
          <Sparkles size={18} />

          <span>
            <small>Награда</small>
            <strong>
              {task.reward} баллов
            </strong>
          </span>
        </div>
      </div>

      <div className="student-task-progress">
        <div>
          <span>Прогресс выполнения</span>
          <strong>
            {getTaskProgress(
              taskData.status,
            )}
            %
          </strong>
        </div>

        <div className="student-task-progress-track">
          <span
            style={{
              width: `${getTaskProgress(
                taskData.status,
              )}%`,
            }}
          />
        </div>
      </div>

      {taskData.reportText && (
        <div className="task-report-box">
          <div>
            <FileText size={17} />
            Ваш отчёт
          </div>

          <p>{taskData.reportText}</p>
        </div>
      )}

      {taskData.teacherComment && (
        <div className="task-teacher-note">
          <strong>
            Комментарий учителя
          </strong>

          <p>
            {taskData.teacherComment}
          </p>
        </div>
      )}

      <div className="student-task-actions">
        {isApproved && (
          <div className="task-complete-message">
            <CheckCircle2 size={20} />
            Задание успешно выполнено
          </div>
        )}

        {isPending && (
          <div className="task-pending-message">
            <Clock3 size={20} />
            Работа отправлена на проверку
          </div>
        )}

        {!isApproved && !isPending && (
          <button
            type="button"
            className={
              isRejected
                ? 'task-fix-button'
                : 'task-start-button'
            }
            onClick={() =>
              openReportModal(task)
            }
          >
            {isRejected ? (
              <>
                <Edit3 size={19} />
                Исправить работу
              </>
            ) : (
              <>
                <Send size={19} />
                Приступить к работе
              </>
            )}
          </button>
        )}
      </div>
    </article>
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
    <div
      className="modern-task-modal"
      role="presentation"
      onMouseDown={(event) => {
        if (
          event.target === event.currentTarget
        ) {
          close()
        }
      }}
    >
      <form
        className="modern-task-modal-card"
        onSubmit={submit}
      >
        <button
          type="button"
          className="modern-task-modal-close"
          onClick={close}
          aria-label="Закрыть"
        >
          <X size={21} />
        </button>

        <div className="modern-task-modal-icon">
          <Send size={25} />
        </div>

        <h2>Отправить отчёт</h2>

        <p className="modern-task-modal-description">
          Задание:{' '}
          <strong>{task.title}</strong>
        </p>

        <label className="task-field">
          <span>Отчёт о выполнении</span>

          <textarea
            value={reportText}
            onChange={(event) =>
              setReportText(
                event.target.value,
              )
            }
            placeholder="Напишите, что вы выполнили и какой результат получили"
            required
          />
        </label>

        <div className="modern-task-modal-actions">
          <button
            className="task-start-button"
            type="submit"
          >
            <Send size={18} />
            Отправить учителю
          </button>

          <button
            className="task-modal-cancel"
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

function SubjectIcon({ subject }) {
  const subjectName =
    String(subject || '').toLowerCase()

  let Icon = BookOpen
  let colorClass = 'subject-icon--blue'

  if (
    subjectName.includes('математ') ||
    subjectName.includes('физик')
  ) {
    Icon = GraduationCap
    colorClass = 'subject-icon--blue'
  } else if (
    subjectName.includes('рус') ||
    subjectName.includes('кыргыз') ||
    subjectName.includes('англий')
  ) {
    Icon = BookOpen
    colorClass = 'subject-icon--green'
  } else if (
    subjectName.includes('информат')
  ) {
    Icon = FileText
    colorClass = 'subject-icon--purple'
  } else if (
    subjectName.includes('истор')
  ) {
    Icon = Clock3
    colorClass = 'subject-icon--orange'
  }

  return (
    <div
      className={`subject-icon ${colorClass}`}
    >
      <Icon size={23} />
    </div>
  )
}

function TaskStatus({
  status,
  text,
}) {
  return (
    <span
      className={`modern-task-status modern-task-status--${status}`}
    >
      {text}
    </span>
  )
}

function TaskEmptyState({
  icon: Icon,
  title,
  text,
}) {
  return (
    <div className="task-empty-card">
      <div className="task-empty-icon">
        <Icon size={29} />
      </div>

      <h3>{title}</h3>
      <p>{text}</p>
    </div>
  )
}

function getTaskProgress(status) {
  const progress = {
    new: 0,
    rejected: 45,
    pending: 75,
    approved: 100,
  }

  return progress[status] ?? 0
}

function formatTaskDate(value) {
  if (!value) {
    return 'Дата не указана'
  }

  const date = new Date(
    `${value}T12:00:00`,
  )

  if (Number.isNaN(date.getTime())) {
    return value
  }

  return date.toLocaleDateString(
    'ru-RU',
    {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    },
  )
}

export default TasksPage
