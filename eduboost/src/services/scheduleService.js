const SCHEDULE_KEY = 'eduboost_schedule'

function readSchedule() {
  try {
    return (
      JSON.parse(
        localStorage.getItem(SCHEDULE_KEY),
      ) || []
    )
  } catch {
    return []
  }
}

function saveSchedule(schedule) {
  localStorage.setItem(
    SCHEDULE_KEY,
    JSON.stringify(schedule),
  )
}

export function getAllLessons() {
  return readSchedule()
}

export function createLesson(
  teacher,
  lessonData,
) {
  const schedule = readSchedule()

  const lesson = {
    id: crypto.randomUUID(),
    teacherId: teacher.id,
    teacherName: teacher.name,
    school: teacher.school,
    className: lessonData.className,
    day: lessonData.day,
    lessonNumber: Number(
      lessonData.lessonNumber,
    ),
    startTime: lessonData.startTime,
    endTime: lessonData.endTime,
    subject: lessonData.subject.trim(),
    classroom:
      lessonData.classroom.trim(),
    description:
      lessonData.description.trim(),
    createdAt: new Date().toISOString(),
  }

  const conflict = schedule.find(
    (item) =>
      item.school === lesson.school &&
      item.className ===
        lesson.className &&
      item.day === lesson.day &&
      item.lessonNumber ===
        lesson.lessonNumber,
  )

  if (conflict) {
    throw new Error(
      `Урок №${lesson.lessonNumber} в этот день уже существует`,
    )
  }

  schedule.push(lesson)
  saveSchedule(schedule)

  return lesson
}

export function updateLesson(
  lessonId,
  teacherId,
  lessonData,
) {
  const schedule = readSchedule()

  const updatedSchedule = schedule.map(
    (lesson) => {
      if (
        lesson.id !== lessonId ||
        lesson.teacherId !== teacherId
      ) {
        return lesson
      }

      return {
        ...lesson,
        className: lessonData.className,
        day: lessonData.day,
        lessonNumber: Number(
          lessonData.lessonNumber,
        ),
        startTime:
          lessonData.startTime,
        endTime: lessonData.endTime,
        subject:
          lessonData.subject.trim(),
        classroom:
          lessonData.classroom.trim(),
        description:
          lessonData.description.trim(),
        updatedAt:
          new Date().toISOString(),
      }
    },
  )

  saveSchedule(updatedSchedule)
}

export function deleteLesson(
  lessonId,
  teacherId,
) {
  const updatedSchedule =
    readSchedule().filter(
      (lesson) =>
        !(
          lesson.id === lessonId &&
          lesson.teacherId === teacherId
        ),
    )

  saveSchedule(updatedSchedule)
}

export function getClassSchedule(
  school,
  className,
) {
  return readSchedule()
    .filter(
      (lesson) =>
        lesson.school === school &&
        lesson.className === className,
    )
    .sort((first, second) => {
      const dayDifference =
        getDayIndex(first.day) -
        getDayIndex(second.day)

      if (dayDifference !== 0) {
        return dayDifference
      }

      return (
        first.lessonNumber -
        second.lessonNumber
      )
    })
}

export function getTeacherLessons(
  teacherId,
) {
  return readSchedule()
    .filter(
      (lesson) =>
        lesson.teacherId === teacherId,
    )
    .sort((first, second) => {
      const dayDifference =
        getDayIndex(first.day) -
        getDayIndex(second.day)

      if (dayDifference !== 0) {
        return dayDifference
      }

      return (
        first.lessonNumber -
        second.lessonNumber
      )
    })
}

export function getLessonsByDay(
  school,
  className,
  day,
) {
  return getClassSchedule(
    school,
    className,
  ).filter(
    (lesson) => lesson.day === day,
  )
}

export function getTodayName() {
  const dayNames = [
    'Воскресенье',
    'Понедельник',
    'Вторник',
    'Среда',
    'Четверг',
    'Пятница',
    'Суббота',
  ]

  return dayNames[new Date().getDay()]
}

export function getNextLesson(
  school,
  className,
) {
  const today = getTodayName()

  const todayLessons = getLessonsByDay(
    school,
    className,
    today,
  )

  const currentTime = new Date()
    .toTimeString()
    .slice(0, 5)

  return (
    todayLessons.find(
      (lesson) =>
        lesson.endTime >= currentTime,
    ) || null
  )
}

export function getDayIndex(day) {
  const days = {
    Понедельник: 1,
    Вторник: 2,
    Среда: 3,
    Четверг: 4,
    Пятница: 5,
    Суббота: 6,
    Воскресенье: 7,
  }

  return days[day] || 99
}