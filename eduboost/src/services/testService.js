import {
  createNotification,
  createNotificationsForUsers,
  getParentsForStudent,
  getStudentsForTask,
} from './notificationService'

const TESTS_KEY = 'eduboost_tests'
const TEST_ATTEMPTS_KEY =
  'eduboost_test_attempts'
const USERS_KEY = 'eduboost_users'
const CURRENT_USER_KEY =
  'eduboost_current_user'

function readStorage(key) {
  try {
    return (
      JSON.parse(
        localStorage.getItem(key),
      ) || []
    )
  } catch {
    return []
  }
}

function saveStorage(key, value) {
  localStorage.setItem(
    key,
    JSON.stringify(value),
  )
}

export function getTests() {
  return readStorage(TESTS_KEY)
}

export function getTestAttempts() {
  return readStorage(TEST_ATTEMPTS_KEY)
}

export function createTest(
  teacher,
  testData,
) {
  const tests = getTests()

  const questions = testData.questions
    .map((question) => ({
      id:
        question.id ||
        crypto.randomUUID(),
      text: question.text.trim(),
      options: question.options.map(
        (option) => option.trim(),
      ),
      correctAnswer: Number(
        question.correctAnswer,
      ),
    }))
    .filter(
      (question) =>
        question.text &&
        question.options.every(Boolean),
    )

  if (questions.length === 0) {
    throw new Error(
      'Добавьте хотя бы один вопрос',
    )
  }

  const newTest = {
    id: crypto.randomUUID(),
    teacherId: teacher.id,
    teacherName: teacher.name,
    school: teacher.school,
    className: testData.className,
    title: testData.title.trim(),
    subject: testData.subject.trim(),
    description:
      testData.description.trim(),
    deadline: testData.deadline,
    rewardPoints: Number(
      testData.rewardPoints || 0,
    ),
    rewardXp: Number(
      testData.rewardXp || 0,
    ),
    maxAttempts: Number(
      testData.maxAttempts || 1,
    ),
    questions,
    createdAt: new Date().toISOString(),
  }

  tests.push(newTest)
  saveStorage(TESTS_KEY, tests)

  const students =
    getStudentsForTask(newTest)

  createNotificationsForUsers(
    students.map(
      (student) => student.id,
    ),
    {
      title: 'Новый тест',
      message: `${newTest.subject}: ${newTest.title}`,
      type: 'task',
      link: '/tests',
    },
  )

  return newTest
}

export function deleteTest(
  testId,
  teacherId,
) {
  const tests = getTests().filter(
    (test) =>
      !(
        test.id === testId &&
        test.teacherId === teacherId
      ),
  )

  saveStorage(TESTS_KEY, tests)

  const attempts =
    getTestAttempts().filter(
      (attempt) =>
        attempt.testId !== testId,
    )

  saveStorage(
    TEST_ATTEMPTS_KEY,
    attempts,
  )
}

export function getTeacherTests(
  teacherId,
) {
  return getTests()
    .filter(
      (test) =>
        test.teacherId === teacherId,
    )
    .sort(
      (first, second) =>
        new Date(second.createdAt) -
        new Date(first.createdAt),
    )
}

export function getStudentTests(
  student,
) {
  return getTests()
    .filter(
      (test) =>
        test.school === student.school &&
        test.className ===
          student.className,
    )
    .sort(
      (first, second) =>
        new Date(second.createdAt) -
        new Date(first.createdAt),
    )
}

export function getTestById(testId) {
  return getTests().find(
    (test) => test.id === testId,
  )
}

export function getAttemptsByTest(
  testId,
) {
  return getTestAttempts()
    .filter(
      (attempt) =>
        attempt.testId === testId,
    )
    .sort(
      (first, second) =>
        new Date(second.createdAt) -
        new Date(first.createdAt),
    )
}

export function getStudentTestAttempts(
  studentId,
  testId,
) {
  return getTestAttempts()
    .filter(
      (attempt) =>
        attempt.studentId === studentId &&
        (!testId ||
          attempt.testId === testId),
    )
    .sort(
      (first, second) =>
        new Date(second.createdAt) -
        new Date(first.createdAt),
    )
}

export function canStudentAttempt(
  studentId,
  test,
) {
  const attempts =
    getStudentTestAttempts(
      studentId,
      test.id,
    )

  return (
    attempts.length <
    Number(test.maxAttempts || 1)
  )
}

export function submitTestAttempt(
  student,
  test,
  answers,
) {
  if (
    !canStudentAttempt(
      student.id,
      test,
    )
  ) {
    throw new Error(
      'Вы использовали все попытки',
    )
  }

  let correctAnswers = 0

  const checkedAnswers =
    test.questions.map(
      (question, index) => {
        const selectedAnswer =
          answers[index]

        const isCorrect =
          Number(selectedAnswer) ===
          Number(
            question.correctAnswer,
          )

        if (isCorrect) {
          correctAnswers += 1
        }

        return {
          questionId: question.id,
          selectedAnswer:
            selectedAnswer ===
            undefined
              ? null
              : Number(
                  selectedAnswer,
                ),
          correctAnswer: Number(
            question.correctAnswer,
          ),
          isCorrect,
        }
      },
    )

  const totalQuestions =
    test.questions.length

  const percentage = Math.round(
    (correctAnswers /
      totalQuestions) *
      100,
  )

  const earnedPoints = Math.round(
    (Number(test.rewardPoints || 0) *
      percentage) /
      100,
  )

  const earnedXp = Math.round(
    (Number(test.rewardXp || 0) *
      percentage) /
      100,
  )

  const attempts = getTestAttempts()

  const attempt = {
    id: crypto.randomUUID(),
    testId: test.id,
    testTitle: test.title,
    subject: test.subject,
    teacherId: test.teacherId,
    teacherName: test.teacherName,
    studentId: student.id,
    studentName: student.name,
    school: student.school,
    className: student.className,
    answers: checkedAnswers,
    correctAnswers,
    totalQuestions,
    percentage,
    earnedPoints,
    earnedXp,
    createdAt: new Date().toISOString(),
  }

  attempts.push(attempt)

  saveStorage(
    TEST_ATTEMPTS_KEY,
    attempts,
  )

  updateStudentRewards(
    student.id,
    earnedPoints,
    earnedXp,
  )

  createNotification({
    userId: test.teacherId,
    title: 'Тест завершён',
    message: `${student.name} прошёл тест «${test.title}» на ${percentage}%`,
    type: 'submission',
    link: '/teacher-tests',
  })

  createNotificationsForUsers(
    getParentsForStudent(student.id),
    {
      title: 'Результат теста ребёнка',
      message: `${student.name} получил ${percentage}% за тест «${test.title}»`,
      type: 'grade',
      link: '/',
    },
  )

  return attempt
}

function updateStudentRewards(
  studentId,
  points,
  xp,
) {
  const users = readStorage(USERS_KEY)

  const updatedUsers = users.map(
    (user) =>
      user.id === studentId
        ? {
            ...user,
            points:
              Number(
                user.points || 0,
              ) + points,
            xp:
              Number(user.xp || 0) +
              xp,
          }
        : user,
  )

  saveStorage(
    USERS_KEY,
    updatedUsers,
  )

  const currentUser =
    JSON.parse(
      localStorage.getItem(
        CURRENT_USER_KEY,
      ) || 'null',
    )

  if (
    currentUser?.id === studentId
  ) {
    localStorage.setItem(
      CURRENT_USER_KEY,
      JSON.stringify({
        ...currentUser,
        points:
          Number(
            currentUser.points || 0,
          ) + points,
        xp:
          Number(
            currentUser.xp || 0,
          ) + xp,
      }),
    )
  }
}

export function getAverageTestResult(
  attempts,
) {
  if (!attempts.length) {
    return 0
  }

  const total = attempts.reduce(
    (sum, attempt) =>
      sum +
      Number(
        attempt.percentage || 0,
      ),
    0,
  )

  return Math.round(
    total / attempts.length,
  )
}