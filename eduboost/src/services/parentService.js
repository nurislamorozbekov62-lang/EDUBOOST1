const LINKS_KEY = 'eduboost_parent_links'
const GRADES_KEY = 'eduboost_grades'
const ATTENDANCE_KEY = 'eduboost_attendance'
const PARENT_REWARDS_KEY = 'eduboost_parent_rewards'

function readStorage(key) {
  try {
    return JSON.parse(localStorage.getItem(key)) || []
  } catch {
    return []
  }
}

function saveStorage(key, value) {
  localStorage.setItem(key, JSON.stringify(value))
}

export function getStudentCode(student) {
  if (!student?.id) {
    return ''
  }

  const cleanId = student.id
    .replaceAll('-', '')
    .toUpperCase()

  return `EB-${cleanId.slice(-6)}`
}

export function findStudentByCode(code) {
  const normalizedCode = code
    .trim()
    .toUpperCase()

  const users = readStorage('eduboost_users')

  return users.find(
    (user) =>
      user.role === 'Ученик' &&
      getStudentCode(user) === normalizedCode,
  )
}

export function linkParentToStudent(
  parent,
  studentCode,
) {
  const student = findStudentByCode(
    studentCode,
  )

  if (!student) {
    throw new Error(
      'Ученик с таким кодом не найден',
    )
  }

  const links = readStorage(LINKS_KEY)

  const alreadyLinked = links.some(
    (link) =>
      link.parentId === parent.id &&
      link.studentId === student.id,
  )

  if (!alreadyLinked) {
    links.push({
      id: crypto.randomUUID(),
      parentId: parent.id,
      parentName: parent.name,
      studentId: student.id,
      studentName: student.name,
      linkedAt: new Date().toISOString(),
    })

    saveStorage(LINKS_KEY, links)
  }

  return student
}

export function getLinkedStudents(parentId) {
  const links = readStorage(LINKS_KEY)
  const users = readStorage(
    'eduboost_users',
  )

  const studentIds = links
    .filter(
      (link) =>
        link.parentId === parentId,
    )
    .map((link) => link.studentId)

  return users.filter(
    (user) =>
      user.role === 'Ученик' &&
      studentIds.includes(user.id),
  )
}

export function removeParentLink(
  parentId,
  studentId,
) {
  const updatedLinks = readStorage(
    LINKS_KEY,
  ).filter(
    (link) =>
      !(
        link.parentId === parentId &&
        link.studentId === studentId
      ),
  )

  saveStorage(LINKS_KEY, updatedLinks)
}

export function getStudentTasks(student) {
  const tasks = readStorage(
    'eduboost_tasks',
  )

  const submissions = readStorage(
    'eduboost_submissions',
  )

  return tasks
    .filter(
      (task) =>
        task.school === student.school &&
        task.className ===
          student.className,
    )
    .map((task) => {
      const submission =
        submissions.find(
          (item) =>
            item.taskId === task.id &&
            item.studentId === student.id,
        )

      return {
        ...task,
        submission:
          submission || null,
        status:
          submission?.status || 'new',
      }
    })
}

export function getOverdueTasks(student) {
  const today = new Date()
    .toISOString()
    .slice(0, 10)

  return getStudentTasks(student).filter(
    (task) =>
      task.deadline < today &&
      task.status !== 'approved',
  )
}

export function getStudentGrades(
  studentId,
) {
  return readStorage(GRADES_KEY)
    .filter(
      (grade) =>
        grade.studentId === studentId,
    )
    .sort(
      (a, b) =>
        new Date(b.date) -
        new Date(a.date),
    )
}

export function getStudentAttendance(
  studentId,
) {
  return readStorage(ATTENDANCE_KEY)
    .filter(
      (record) =>
        record.studentId === studentId,
    )
    .sort(
      (a, b) =>
        new Date(b.date) -
        new Date(a.date),
    )
}

export function calculateAverageGrade(
  grades,
) {
  if (!grades.length) {
    return 0
  }

  const total = grades.reduce(
    (sum, grade) =>
      sum + Number(grade.value || 0),
    0,
  )

  return Number(
    (total / grades.length).toFixed(2),
  )
}

export function calculateAttendance(
  records,
) {
  if (!records.length) {
    return {
      percent: 0,
      present: 0,
      absent: 0,
      late: 0,
    }
  }

  const present = records.filter(
    (record) =>
      record.status === 'present',
  ).length

  const absent = records.filter(
    (record) =>
      record.status === 'absent',
  ).length

  const late = records.filter(
    (record) =>
      record.status === 'late',
  ).length

  return {
    percent: Math.round(
      (present / records.length) * 100,
    ),
    present,
    absent,
    late,
  }
}

export function getParentRewards(
  parentId,
  studentId,
) {
  return readStorage(
    PARENT_REWARDS_KEY,
  ).filter(
    (reward) =>
      reward.parentId === parentId &&
      reward.studentId === studentId,
  )
}

export function createParentReward(
  parent,
  student,
  rewardData,
) {
  const rewards = readStorage(
    PARENT_REWARDS_KEY,
  )

  const reward = {
    id: crypto.randomUUID(),
    parentId: parent.id,
    parentName: parent.name,
    studentId: student.id,
    studentName: student.name,
    title: rewardData.title.trim(),
    description:
      rewardData.description.trim(),
    requiredPoints: Number(
      rewardData.requiredPoints,
    ),
    claimed: false,
    createdAt: new Date().toISOString(),
  }

  rewards.push(reward)
  saveStorage(PARENT_REWARDS_KEY, rewards)

  return reward
}

export function claimParentReward(
  rewardId,
) {
  const rewards = readStorage(
    PARENT_REWARDS_KEY,
  )

  const updatedRewards = rewards.map(
    (reward) =>
      reward.id === rewardId
        ? {
            ...reward,
            claimed: true,
            claimedAt:
              new Date().toISOString(),
          }
        : reward,
  )

  saveStorage(
    PARENT_REWARDS_KEY,
    updatedRewards,
  )
}