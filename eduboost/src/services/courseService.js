const COURSES_KEY = 'eduboost_courses'
const COURSE_PROGRESS_KEY = 'eduboost_course_progress'
const USERS_KEY = 'eduboost_users'
const CURRENT_USER_KEY = 'eduboost_current_user'

export const MAX_FILE_SIZE = 2 * 1024 * 1024
export const MAX_FILES_PER_LESSON = 5

export const ALLOWED_FILE_EXTENSIONS = [
  'pdf',
  'doc',
  'docx',
  'ppt',
  'pptx',
  'xls',
  'xlsx',
  'txt',
  'jpg',
  'jpeg',
  'png',
  'webp',
  'zip',
  'rar',
]

function generateId(prefix = 'item') {
  return `${prefix}_${Date.now()}_${Math.random()
    .toString(36)
    .slice(2, 9)}`
}

function readStorage(key, fallback = []) {
  try {
    const value = localStorage.getItem(key)

    if (!value) {
      return fallback
    }

    return JSON.parse(value)
  } catch (error) {
    console.error(`Ошибка чтения ${key}:`, error)
    return fallback
  }
}

function writeStorage(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch (error) {
    console.error(`Ошибка сохранения ${key}:`, error)

    throw new Error(
      'Недостаточно места для сохранения. Удалите крупные файлы или курсы.'
    )
  }
}

function getCurrentUser() {
  return readStorage(CURRENT_USER_KEY, null)
}

function getUserName(user) {
  return (
    user?.name ||
    user?.fullName ||
    user?.username ||
    'Пользователь'
  )
}

function updateUserEverywhere(updatedUser) {
  writeStorage(CURRENT_USER_KEY, updatedUser)

  const users = readStorage(USERS_KEY, [])

  const userExists = users.some(
    (user) => user.id === updatedUser.id
  )

  const updatedUsers = userExists
    ? users.map((user) =>
        user.id === updatedUser.id ? updatedUser : user
      )
    : [...users, updatedUser]

  writeStorage(USERS_KEY, updatedUsers)
}

function normalizeLessons(lessons = []) {
  return lessons
    .map((lesson, index) => ({
      ...lesson,
      order: index + 1,
    }))
    .sort((a, b) => a.order - b.order)
}

function getFileExtension(fileName = '') {
  return fileName.split('.').pop()?.toLowerCase() || ''
}

export function validateLessonFile(file) {
  if (!file) {
    throw new Error('Файл не выбран')
  }

  const extension = getFileExtension(file.name)

  if (!ALLOWED_FILE_EXTENSIONS.includes(extension)) {
    throw new Error(
      `Формат .${extension || 'неизвестный'} не поддерживается`
    )
  }

  if (file.size > MAX_FILE_SIZE) {
    throw new Error(
      `Файл "${file.name}" больше 2 МБ`
    )
  }

  return true
}

export function convertFileToAttachment(file) {
  validateLessonFile(file)

  return new Promise((resolve, reject) => {
    const reader = new FileReader()

    reader.onload = () => {
      resolve({
        id: generateId('file'),
        name: file.name,
        type: file.type || 'application/octet-stream',
        extension: getFileExtension(file.name),
        size: file.size,
        dataUrl: reader.result,
        uploadedAt: new Date().toISOString(),
      })
    }

    reader.onerror = () => {
      reject(
        new Error(`Не удалось прочитать файл "${file.name}"`)
      )
    }

    reader.readAsDataURL(file)
  })
}

export async function convertFilesToAttachments(files) {
  const selectedFiles = Array.from(files || [])

  if (selectedFiles.length > MAX_FILES_PER_LESSON) {
    throw new Error(
      `Можно добавить максимум ${MAX_FILES_PER_LESSON} файлов`
    )
  }

  return Promise.all(
    selectedFiles.map((file) =>
      convertFileToAttachment(file)
    )
  )
}

export function downloadAttachment(attachment) {
  if (!attachment?.dataUrl) {
    throw new Error('Файл повреждён или не найден')
  }

  const link = document.createElement('a')

  link.href = attachment.dataUrl
  link.download = attachment.name || 'material'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

export function getCourses() {
  return readStorage(COURSES_KEY, [])
}

export function getPublishedCourses() {
  return getCourses().filter(
    (course) => course.status === 'published'
  )
}

export function getTeacherCourses(teacherId) {
  return getCourses().filter(
    (course) => course.teacherId === teacherId
  )
}

export function getCourseById(courseId) {
  return (
    getCourses().find(
      (course) => course.id === courseId
    ) || null
  )
}

export function createCourse(courseData) {
  const currentUser = getCurrentUser()

  if (!currentUser) {
    throw new Error('Пользователь не найден')
  }

  if (currentUser.role !== 'Учитель') {
    throw new Error(
      'Создавать курсы может только учитель'
    )
  }

  if (!courseData.title?.trim()) {
    throw new Error('Введите название курса')
  }

  if (!courseData.subject?.trim()) {
    throw new Error('Укажите предмет')
  }

  const courses = getCourses()

  const newCourse = {
    id: generateId('course'),
    title: courseData.title.trim(),
    description: courseData.description?.trim() || '',
    subject: courseData.subject.trim(),
    coverEmoji: courseData.coverEmoji || '📘',
    level: courseData.level || 'Начальный',
    className: courseData.className || 'Все классы',
    language: courseData.language || 'Русский',
    accessType: courseData.accessType || 'free',
    price: Number(courseData.price) || 0,
    status: 'draft',
    teacherId: currentUser.id,
    teacherName: getUserName(currentUser),
    lessons: [],
    enrolledStudentIds: [],
    studentsCount: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }

  writeStorage(COURSES_KEY, [
    newCourse,
    ...courses,
  ])

  return newCourse
}

export function updateCourse(courseId, updates) {
  const courses = getCourses()
  let updatedCourse = null

  const updatedCourses = courses.map((course) => {
    if (course.id !== courseId) {
      return course
    }

    updatedCourse = {
      ...course,
      ...updates,
      updatedAt: new Date().toISOString(),
    }

    return updatedCourse
  })

  if (!updatedCourse) {
    throw new Error('Курс не найден')
  }

  writeStorage(COURSES_KEY, updatedCourses)

  return updatedCourse
}

export function deleteCourse(courseId) {
  const courses = getCourses()

  writeStorage(
    COURSES_KEY,
    courses.filter(
      (course) => course.id !== courseId
    )
  )

  const progress = getAllCourseProgress()

  writeStorage(
    COURSE_PROGRESS_KEY,
    progress.filter(
      (item) => item.courseId !== courseId
    )
  )
}

export function publishCourse(courseId) {
  const course = getCourseById(courseId)

  if (!course) {
    throw new Error('Курс не найден')
  }

  if (!course.lessons?.length) {
    throw new Error(
      'Перед публикацией добавьте хотя бы один урок'
    )
  }

  return updateCourse(courseId, {
    status: 'published',
    publishedAt: new Date().toISOString(),
  })
}

export function moveCourseToDraft(courseId) {
  return updateCourse(courseId, {
    status: 'draft',
  })
}

export function addLesson(courseId, lessonData) {
  const courses = getCourses()
  const course = courses.find(
    (item) => item.id === courseId
  )

  if (!course) {
    throw new Error('Курс не найден')
  }

  if (!lessonData.title?.trim()) {
    throw new Error('Введите название урока')
  }

  if (
    !lessonData.content?.trim() &&
    !lessonData.videoUrl?.trim() &&
    !lessonData.attachments?.length
  ) {
    throw new Error(
      'Добавьте текст, видео или хотя бы один файл'
    )
  }

  if (
    lessonData.attachments?.length >
    MAX_FILES_PER_LESSON
  ) {
    throw new Error(
      `Можно добавить максимум ${MAX_FILES_PER_LESSON} файлов`
    )
  }

  const newLesson = {
    id: generateId('lesson'),
    title: lessonData.title.trim(),
    description:
      lessonData.description?.trim() || '',
    content: lessonData.content?.trim() || '',
    videoUrl: lessonData.videoUrl?.trim() || '',
    attachments: lessonData.attachments || [],
    duration: Number(lessonData.duration) || 10,
    pointsReward:
      Number(lessonData.pointsReward) || 10,
    xpReward: Number(lessonData.xpReward) || 20,
    isPreview: Boolean(lessonData.isPreview),
    order: course.lessons.length + 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }

  const updatedCourses = courses.map((item) => {
    if (item.id !== courseId) {
      return item
    }

    return {
      ...item,
      lessons: normalizeLessons([
        ...(item.lessons || []),
        newLesson,
      ]),
      updatedAt: new Date().toISOString(),
    }
  })

  writeStorage(COURSES_KEY, updatedCourses)

  return newLesson
}

export function updateLesson(
  courseId,
  lessonId,
  updates
) {
  const courses = getCourses()
  let lessonFound = false

  const updatedCourses = courses.map((course) => {
    if (course.id !== courseId) {
      return course
    }

    const updatedLessons = course.lessons.map(
      (lesson) => {
        if (lesson.id !== lessonId) {
          return lesson
        }

        lessonFound = true

        return {
          ...lesson,
          ...updates,
          updatedAt: new Date().toISOString(),
        }
      }
    )

    return {
      ...course,
      lessons: normalizeLessons(updatedLessons),
      updatedAt: new Date().toISOString(),
    }
  })

  if (!lessonFound) {
    throw new Error('Урок не найден')
  }

  writeStorage(COURSES_KEY, updatedCourses)
}

export function deleteLesson(courseId, lessonId) {
  const courses = getCourses()

  const updatedCourses = courses.map((course) => {
    if (course.id !== courseId) {
      return course
    }

    const lessons = course.lessons.filter(
      (lesson) => lesson.id !== lessonId
    )

    return {
      ...course,
      lessons: normalizeLessons(lessons),
      updatedAt: new Date().toISOString(),
    }
  })

  writeStorage(COURSES_KEY, updatedCourses)

  const progress = getAllCourseProgress()

  const updatedProgress = progress.map((item) => {
    if (item.courseId !== courseId) {
      return item
    }

    return {
      ...item,
      completedLessonIds:
        item.completedLessonIds.filter(
          (id) => id !== lessonId
        ),
      updatedAt: new Date().toISOString(),
    }
  })

  writeStorage(
    COURSE_PROGRESS_KEY,
    updatedProgress
  )
}

export function moveLesson(
  courseId,
  lessonId,
  direction
) {
  const course = getCourseById(courseId)

  if (!course) {
    throw new Error('Курс не найден')
  }

  const lessons = [...course.lessons].sort(
    (a, b) => a.order - b.order
  )

  const currentIndex = lessons.findIndex(
    (lesson) => lesson.id === lessonId
  )

  if (currentIndex === -1) {
    throw new Error('Урок не найден')
  }

  const targetIndex =
    direction === 'up'
      ? currentIndex - 1
      : currentIndex + 1

  if (
    targetIndex < 0 ||
    targetIndex >= lessons.length
  ) {
    return course
  }

  const currentLesson = lessons[currentIndex]
  lessons[currentIndex] = lessons[targetIndex]
  lessons[targetIndex] = currentLesson

  return updateCourse(courseId, {
    lessons: normalizeLessons(lessons),
  })
}

export function removeLessonAttachment(
  courseId,
  lessonId,
  attachmentId
) {
  const course = getCourseById(courseId)

  if (!course) {
    throw new Error('Курс не найден')
  }

  const lesson = course.lessons.find(
    (item) => item.id === lessonId
  )

  if (!lesson) {
    throw new Error('Урок не найден')
  }

  const attachments = (
    lesson.attachments || []
  ).filter(
    (attachment) =>
      attachment.id !== attachmentId
  )

  updateLesson(courseId, lessonId, {
    attachments,
  })
}

export function getAllCourseProgress() {
  return readStorage(COURSE_PROGRESS_KEY, [])
}

export function getStudentCourseProgress(
  studentId,
  courseId
) {
  return (
    getAllCourseProgress().find(
      (item) =>
        item.studentId === studentId &&
        item.courseId === courseId
    ) || null
  )
}

export function getStudentAllCourseProgress(
  studentId
) {
  return getAllCourseProgress().filter(
    (item) => item.studentId === studentId
  )
}

export function enrollInCourse(courseId) {
  const currentUser = getCurrentUser()
  const course = getCourseById(courseId)

  if (!currentUser) {
    throw new Error('Пользователь не найден')
  }

  if (currentUser.role !== 'Ученик') {
    throw new Error(
      'Записаться на курс может только ученик'
    )
  }

  if (!course) {
    throw new Error('Курс не найден')
  }

  if (course.status !== 'published') {
    throw new Error('Курс ещё не опубликован')
  }

  const existingProgress =
    getStudentCourseProgress(
      currentUser.id,
      courseId
    )

  if (existingProgress) {
    return existingProgress
  }

  const progress = getAllCourseProgress()

  const newProgress = {
    id: generateId('progress'),
    studentId: currentUser.id,
    studentName: getUserName(currentUser),
    courseId,
    completedLessonIds: [],
    earnedPoints: 0,
    earnedXp: 0,
    progressPercent: 0,
    status: 'in_progress',
    startedAt: new Date().toISOString(),
    completedAt: null,
    updatedAt: new Date().toISOString(),
  }

  writeStorage(COURSE_PROGRESS_KEY, [
    newProgress,
    ...progress,
  ])

  const enrolledStudentIds = Array.from(
    new Set([
      ...(course.enrolledStudentIds || []),
      currentUser.id,
    ])
  )

  updateCourse(courseId, {
    enrolledStudentIds,
    studentsCount: enrolledStudentIds.length,
  })

  return newProgress
}

export function canOpenLesson(
  courseId,
  lessonId,
  studentId
) {
  const course = getCourseById(courseId)

  if (!course) {
    return false
  }

  const lessons = [...course.lessons].sort(
    (a, b) => a.order - b.order
  )

  const lessonIndex = lessons.findIndex(
    (lesson) => lesson.id === lessonId
  )

  if (lessonIndex <= 0) {
    return true
  }

  const progress = getStudentCourseProgress(
    studentId,
    courseId
  )

  if (!progress) {
    return false
  }

  const previousLesson = lessons[lessonIndex - 1]

  return progress.completedLessonIds.includes(
    previousLesson.id
  )
}

export function completeLesson(
  courseId,
  lessonId
) {
  const currentUser = getCurrentUser()
  const course = getCourseById(courseId)

  if (!currentUser) {
    throw new Error('Пользователь не найден')
  }

  if (!course) {
    throw new Error('Курс не найден')
  }

  const lesson = course.lessons.find(
    (item) => item.id === lessonId
  )

  if (!lesson) {
    throw new Error('Урок не найден')
  }

  if (
    !canOpenLesson(
      courseId,
      lessonId,
      currentUser.id
    )
  ) {
    throw new Error(
      'Сначала завершите предыдущий урок'
    )
  }

  let progress = getStudentCourseProgress(
    currentUser.id,
    courseId
  )

  if (!progress) {
    progress = enrollInCourse(courseId)
  }

  if (
    progress.completedLessonIds.includes(
      lessonId
    )
  ) {
    return {
      progress,
      rewardAlreadyReceived: true,
    }
  }

  const completedLessonIds = [
    ...progress.completedLessonIds,
    lessonId,
  ]

  const lessonsCount = course.lessons.length

  const progressPercent =
    lessonsCount > 0
      ? Math.round(
          (completedLessonIds.length /
            lessonsCount) *
            100
        )
      : 0

  const isCompleted =
    completedLessonIds.length >= lessonsCount

  const updatedProgress = {
    ...progress,
    completedLessonIds,
    earnedPoints:
      (progress.earnedPoints || 0) +
      lesson.pointsReward,
    earnedXp:
      (progress.earnedXp || 0) +
      lesson.xpReward,
    progressPercent,
    status: isCompleted
      ? 'completed'
      : 'in_progress',
    completedAt: isCompleted
      ? new Date().toISOString()
      : null,
    updatedAt: new Date().toISOString(),
  }

  const allProgress = getAllCourseProgress()

  writeStorage(
    COURSE_PROGRESS_KEY,
    allProgress.map((item) =>
      item.id === progress.id
        ? updatedProgress
        : item
    )
  )

  const updatedUser = {
    ...currentUser,
    points:
      (Number(currentUser.points) || 0) +
      lesson.pointsReward,
    xp:
      (Number(currentUser.xp) || 0) +
      lesson.xpReward,
  }

  updateUserEverywhere(updatedUser)

  return {
    progress: updatedProgress,
    rewardAlreadyReceived: false,
    receivedPoints: lesson.pointsReward,
    receivedXp: lesson.xpReward,
    courseCompleted: isCompleted,
  }
}

export function getCourseProgressPercent(
  studentId,
  courseId
) {
  const progress = getStudentCourseProgress(
    studentId,
    courseId
  )

  return progress?.progressPercent || 0
}

export function getCourseStudents(courseId) {
  return getAllCourseProgress().filter(
    (item) => item.courseId === courseId
  )
}

export function getCourseStatistics(courseId) {
  const course = getCourseById(courseId)
  const students = getCourseStudents(courseId)

  const completedStudents = students.filter(
    (student) => student.status === 'completed'
  )

  const averageProgress = students.length
    ? Math.round(
        students.reduce(
          (sum, student) =>
            sum +
            (student.progressPercent || 0),
          0
        ) / students.length
      )
    : 0

  return {
    lessonsCount: course?.lessons?.length || 0,
    studentsCount: students.length,
    completedStudentsCount:
      completedStudents.length,
    averageProgress,
  }
}