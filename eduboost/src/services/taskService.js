import {
  createNotificationsForUsers,
  getStudentsForTask,
} from './notificationService'

const TASKS_KEY = 'eduboost_tasks'
const SUBMISSIONS_KEY = 'eduboost_submissions'

export function getTasks() {
  try {
    return JSON.parse(localStorage.getItem(TASKS_KEY)) || []
  } catch {
    return []
  }
}

export function saveTasks(tasks) {
  localStorage.setItem(TASKS_KEY, JSON.stringify(tasks))
}

export function createTask(taskData, teacher) {
  const tasks = getTasks()

  const newTask = {
    id: crypto.randomUUID(),
    title: taskData.title.trim(),
    subject: taskData.subject,
    description: taskData.description.trim(),
    className: taskData.className,
    deadline: taskData.deadline,
    reward: Number(taskData.reward),
    affectsStreak: taskData.affectsStreak,
    school: teacher.school,
    teacherId: teacher.id,
    teacherName: teacher.name,
    createdAt: new Date().toISOString(),
  }

  const updatedTasks = [...tasks, newTask]
  saveTasks(updatedTasks)
  const students = getStudentsForTask(newTask)

createNotificationsForUsers(
  students.map((student) => student.id),
  {
    title: 'Новое задание',
    message: `${newTask.subject}: ${newTask.title}`,
    type: 'task',
    link: '/tasks',
  },
)

  return newTask
}

export function getTasksForStudent(student) {
  return getTasks().filter(
    (task) =>
      task.school === student.school &&
      task.className === student.className,
  )
}

export function getTasksForTeacher(teacher) {
  return getTasks().filter(
    (task) => task.teacherId === teacher.id,
  )
}

export function deleteTask(taskId) {
  const updatedTasks = getTasks().filter(
    (task) => task.id !== taskId,
  )

  saveTasks(updatedTasks)

  const updatedSubmissions = getSubmissions().filter(
    (submission) => submission.taskId !== taskId,
  )

  saveSubmissions(updatedSubmissions)
}

export function getSubmissions() {
  try {
    return JSON.parse(
      localStorage.getItem(SUBMISSIONS_KEY),
    ) || []
  } catch {
    return []
  }
}

export function saveSubmissions(submissions) {
  localStorage.setItem(
    SUBMISSIONS_KEY,
    JSON.stringify(submissions),
  )
}

export function submitTask(task, student, reportText) {
  const submissions = getSubmissions()

  const existingSubmissionIndex =
    submissions.findIndex(
      (submission) =>
        submission.taskId === task.id &&
        submission.studentId === student.id,
    )

  const newSubmission = {
    id:
      existingSubmissionIndex >= 0
        ? submissions[existingSubmissionIndex].id
        : crypto.randomUUID(),
    taskId: task.id,
    taskTitle: task.title,
    taskReward: task.reward,
    affectsStreak: task.affectsStreak,
    studentId: student.id,
    studentName: student.name,
    studentEmail: student.email,
    className: student.className,
    school: student.school,
    teacherId: task.teacherId,
    reportText: reportText.trim(),
    status: 'pending',
    teacherComment: '',
    rewardGiven:
      existingSubmissionIndex >= 0
        ? submissions[existingSubmissionIndex]
            .rewardGiven
        : false,
    submittedAt: new Date().toISOString(),
  }

  if (existingSubmissionIndex >= 0) {
    submissions[existingSubmissionIndex] =
      newSubmission
  } else {
    submissions.push(newSubmission)
  }

  saveSubmissions(submissions)

  createNotification({
  userId: task.teacherId,
  title: 'Новый отчёт ученика',
  message: `${student.name} отправил отчёт по заданию «${task.title}»`,
  type: 'submission',
  link: '/tasks',
})
 
return newSubmission
}

export function getStudentSubmission(
  taskId,
  studentId,
) {
  return getSubmissions().find(
    (submission) =>
      submission.taskId === taskId &&
      submission.studentId === studentId,
  )
}

export function getTeacherSubmissions(teacher) {
  return getSubmissions().filter(
    (submission) =>
      submission.teacherId === teacher.id,
  )
}

export function updateSubmissionStatus(
  submissionId,
  status,
  teacherComment = '',
) {
  const submissions = getSubmissions()

  const updatedSubmissions = submissions.map(
    (submission) =>
      submission.id === submissionId
        ? {
            ...submission,
            status,
            teacherComment:
              teacherComment.trim(),
            reviewedAt:
              new Date().toISOString(),
          }
        : submission,
  )

  saveSubmissions(updatedSubmissions)

  return updatedSubmissions.find(
    (submission) =>
      submission.id === submissionId,
  )
}