import { supabase } from '../lib/supabase'


const DAYS = [
  'Понедельник',
  'Вторник',
  'Среда',
  'Четверг',
  'Пятница',
  'Суббота',
  'Воскресенье',
]


/* =========================================================
   CREATE LESSON
========================================================= */

export async function createScheduleLesson(
  lessonData,
  user,
) {
  validateUserAndLesson(
    lessonData,
    user,
  )

  const teacherId =
    lessonData.teacherId ||
    (
      user.role === 'Учитель'
        ? user.id
        : null
    )

  const teacherName =
    lessonData.teacherName?.trim() ||
    (
      user.role === 'Учитель'
        ? user.name?.trim()
        : ''
    ) ||
    ''

  if (!teacherId) {
    throw new Error(
      'Выберите учителя',
    )
  }

  const payload = {
    ...lessonData,
    teacherId,
    teacherName,
  }

  validateLessonTime(
    payload.startTime,
    payload.endTime,
  )

  /*
    Перед записью проверяем:
    учитель / класс / кабинет.
  */
  await ensureScheduleAvailable(
    payload,
    user,
  )

  const {
    data,
    error,
  } = await supabase
    .from('schedule_lessons')
    .insert({
      school_id:
        user.schoolId ||
        null,

      school:
        user.school ||
        '',

      teacher_id:
        teacherId,

      teacher_name:
        teacherName,

      class_name:
        payload.className.trim(),

      subject:
        payload.subject.trim(),

      room:
        payload.classroom?.trim() ||
        payload.room?.trim() ||
        '',

      weekday:
        payload.weekday ||
        dayToWeekday(
          payload.day,
        ),

      lesson_number:
        Number(
          payload.lessonNumber ||
          1,
        ),

      start_time:
        payload.startTime,

      end_time:
        payload.endTime,

      description:
        payload.description?.trim() ||
        '',

      created_by:
        user.id,
    })
    .select()
    .single()

  if (error) {
    throwScheduleDatabaseError(
      error,
    )
  }

  return normalizeLesson(
    data,
  )
}


/* =========================================================
   SCHOOL SCHEDULE
========================================================= */

export async function getSchoolSchedule(
  user,
) {
  if (
    !user?.schoolId &&
    !user?.school
  ) {
    return []
  }

  let query =
    supabase
      .from('schedule_lessons')
      .select('*')

  query =
    applySchoolFilter(
      query,
      user,
    )

  const {
    data,
    error,
  } =
    await query
      .order(
        'weekday',
        {
          ascending: true,
        },
      )
      .order(
        'lesson_number',
        {
          ascending: true,
        },
      )
      .order(
        'start_time',
        {
          ascending: true,
        },
      )

  if (error) {
    throw new Error(
      error.message ||
        'Не удалось загрузить расписание школы',
    )
  }

  return (
    data || []
  ).map(
    normalizeLesson,
  )
}


/* =========================================================
   TEACHER SCHEDULE
========================================================= */

export async function getScheduleForTeacher(
  user,
) {
  if (!user?.id) {
    return []
  }

  let query =
    supabase
      .from('schedule_lessons')
      .select('*')
      .eq(
        'teacher_id',
        user.id,
      )

  query =
    applySchoolFilter(
      query,
      user,
    )

  const {
    data,
    error,
  } =
    await query
      .order(
        'weekday',
        {
          ascending: true,
        },
      )
      .order(
        'lesson_number',
        {
          ascending: true,
        },
      )
      .order(
        'start_time',
        {
          ascending: true,
        },
      )

  if (error) {
    throw new Error(
      error.message ||
        'Не удалось загрузить расписание учителя',
    )
  }

  return (
    data || []
  ).map(
    normalizeLesson,
  )
}


/* =========================================================
   STUDENT SCHEDULE
========================================================= */

export async function getScheduleForStudent(
  user,
) {
  const className =
    user?.className ||
    user?.class_name ||
    ''

  if (!className) {
    return []
  }

  if (
    !user?.schoolId &&
    !user?.school
  ) {
    return []
  }

  let query =
    supabase
      .from('schedule_lessons')
      .select('*')
      .eq(
        'class_name',
        className,
      )

  query =
    applySchoolFilter(
      query,
      user,
    )

  const {
    data,
    error,
  } =
    await query
      .order(
        'weekday',
        {
          ascending: true,
        },
      )
      .order(
        'lesson_number',
        {
          ascending: true,
        },
      )
      .order(
        'start_time',
        {
          ascending: true,
        },
      )

  if (error) {
    throw new Error(
      error.message ||
        'Не удалось загрузить расписание',
    )
  }

  return (
    data || []
  ).map(
    normalizeLesson,
  )
}


/* =========================================================
   UPDATE LESSON
========================================================= */

export async function updateScheduleLesson(
  lessonId,
  lessonData,
  user = null,
) {
  if (!lessonId) {
    throw new Error(
      'Урок не найден',
    )
  }

  if (
    !lessonData.className?.trim()
  ) {
    throw new Error(
      'Выберите класс',
    )
  }

  if (
    !lessonData.subject?.trim()
  ) {
    throw new Error(
      'Укажите предмет',
    )
  }

  if (!lessonData.teacherId) {
    throw new Error(
      'Выберите учителя',
    )
  }

  validateLessonTime(
    lessonData.startTime,
    lessonData.endTime,
  )

  /*
    Если user передан — проверяем
    конфликты до UPDATE.
  */
  if (user) {
    await ensureScheduleAvailable(
      lessonData,
      user,
      lessonId,
    )
  }

  const {
    data,
    error,
  } = await supabase
    .from('schedule_lessons')
    .update({
      teacher_id:
        lessonData.teacherId,

      teacher_name:
        lessonData.teacherName?.trim() ||
        '',

      class_name:
        lessonData.className.trim(),

      subject:
        lessonData.subject.trim(),

      room:
        lessonData.classroom?.trim() ||
        lessonData.room?.trim() ||
        '',

      weekday:
        lessonData.weekday ||
        dayToWeekday(
          lessonData.day,
        ),

      lesson_number:
        Number(
          lessonData.lessonNumber ||
          1,
        ),

      start_time:
        lessonData.startTime,

      end_time:
        lessonData.endTime,

      description:
        lessonData.description?.trim() ||
        '',
    })
    .eq(
      'id',
      lessonId,
    )
    .select()
    .single()

  if (error) {
    throwScheduleDatabaseError(
      error,
    )
  }

  return normalizeLesson(
    data,
  )
}


/* =========================================================
   DELETE
========================================================= */

export async function deleteScheduleLesson(
  lessonId,
) {
  if (!lessonId) {
    throw new Error(
      'Урок не найден',
    )
  }

  const {
    error,
  } = await supabase
    .from('schedule_lessons')
    .delete()
    .eq(
      'id',
      lessonId,
    )

  if (error) {
    throw new Error(
      error.message ||
        'Не удалось удалить урок',
    )
  }

  return true
}


/* =========================================================
   GET SINGLE LESSON
========================================================= */

export async function getScheduleLessonById(
  lessonId,
) {
  if (!lessonId) {
    return null
  }

  const {
    data,
    error,
  } = await supabase
    .from('schedule_lessons')
    .select('*')
    .eq(
      'id',
      lessonId,
    )
    .maybeSingle()

  if (error) {
    throw new Error(
      error.message ||
        'Не удалось загрузить урок',
    )
  }

  return data
    ? normalizeLesson(
        data,
      )
    : null
}


/* =========================================================
   SCHEDULE FOR DATE
========================================================= */

export async function getScheduleForDate(
  user,
  dateValue,
) {
  if (
    !dateValue ||
    (
      !user?.schoolId &&
      !user?.school
    )
  ) {
    return []
  }

  const weekday =
    getWeekdayFromDate(
      dateValue,
    )

  if (!weekday) {
    return []
  }

  let query =
    supabase
      .from('schedule_lessons')
      .select('*')
      .eq(
        'weekday',
        weekday,
      )

  query =
    applySchoolFilter(
      query,
      user,
    )

  const {
    data,
    error,
  } =
    await query
      .order(
        'lesson_number',
        {
          ascending: true,
        },
      )
      .order(
        'class_name',
        {
          ascending: true,
        },
      )

  if (error) {
    throw new Error(
      error.message ||
        'Не удалось загрузить уроки на выбранную дату',
    )
  }

  return (
    data || []
  ).map(
    normalizeLesson,
  )
}


/* =========================================================
   CONFLICT CHECK

   Проверяет:
   1. Учителя
   2. Класс
   3. Кабинет
========================================================= */

async function ensureScheduleAvailable(
  lessonData,
  user,
  ignoreLessonId = null,
) {
  const weekday =
    Number(
      lessonData.weekday ||
      dayToWeekday(
        lessonData.day,
      ),
    )

  const lessonNumber =
    Number(
      lessonData.lessonNumber ||
      1,
    )

  const teacherId =
    lessonData.teacherId

  const className =
    lessonData.className?.trim() ||
    ''

  const room =
    lessonData.classroom?.trim() ||
    lessonData.room?.trim() ||
    ''

  let query =
    supabase
      .from('schedule_lessons')
      .select(`
        id,
        teacher_id,
        teacher_name,
        class_name,
        subject,
        room,
        weekday,
        lesson_number,
        start_time,
        end_time
      `)
      .eq(
        'weekday',
        weekday,
      )

  query =
    applySchoolFilter(
      query,
      user,
    )

  const {
    data,
    error,
  } = await query

  if (error) {
    throw new Error(
      error.message ||
        'Не удалось проверить конфликты расписания',
    )
  }

  const existingLessons =
    (
      data || []
    )
      .filter(
        (lesson) =>
          lesson.id !==
          ignoreLessonId,
      )


  /* -------------------------------------------------------
     TEACHER CONFLICT
  ------------------------------------------------------- */

  const teacherConflict =
    existingLessons.find(
      (lesson) =>
        lesson.teacher_id ===
          teacherId &&
        lessonsConflict(
          {
            lessonNumber,
            startTime:
              lessonData.startTime,
            endTime:
              lessonData.endTime,
          },
          {
            lessonNumber:
              Number(
                lesson.lesson_number,
              ),
            startTime:
              sliceTime(
                lesson.start_time,
              ),
            endTime:
              sliceTime(
                lesson.end_time,
              ),
          },
        ),
    )

  if (teacherConflict) {
    throw new Error(
      `Учитель уже занят: ${teacherConflict.class_name} · ${teacherConflict.subject} · урок №${teacherConflict.lesson_number}`,
    )
  }


  /* -------------------------------------------------------
     CLASS CONFLICT
  ------------------------------------------------------- */

  const classConflict =
    existingLessons.find(
      (lesson) =>
        normalizeText(
          lesson.class_name,
        ) ===
          normalizeText(
            className,
          ) &&
        lessonsConflict(
          {
            lessonNumber,
            startTime:
              lessonData.startTime,
            endTime:
              lessonData.endTime,
          },
          {
            lessonNumber:
              Number(
                lesson.lesson_number,
              ),
            startTime:
              sliceTime(
                lesson.start_time,
              ),
            endTime:
              sliceTime(
                lesson.end_time,
              ),
          },
        ),
    )

  if (classConflict) {
    throw new Error(
      `У класса ${className} уже есть урок: ${classConflict.subject} · урок №${classConflict.lesson_number}`,
    )
  }


  /* -------------------------------------------------------
     ROOM CONFLICT
  ------------------------------------------------------- */

  if (room) {
    const roomConflict =
      existingLessons.find(
        (lesson) =>
          normalizeText(
            lesson.room,
          ) ===
            normalizeText(
              room,
            ) &&
          lessonsConflict(
            {
              lessonNumber,
              startTime:
                lessonData.startTime,
              endTime:
                lessonData.endTime,
            },
            {
              lessonNumber:
                Number(
                  lesson.lesson_number,
                ),
              startTime:
                sliceTime(
                  lesson.start_time,
                ),
              endTime:
                sliceTime(
                  lesson.end_time,
                ),
            },
          ),
      )

    if (roomConflict) {
      throw new Error(
        `Кабинет ${room} уже занят: ${roomConflict.class_name} · ${roomConflict.subject}`,
      )
    }
  }
}


/* =========================================================
   OVERLAP CHECK

   Сначала сравниваем реальное время.

   Если время отсутствует —
   используем номер урока.
========================================================= */

function lessonsConflict(
  first,
  second,
) {
  const firstHasTime =
    Boolean(
      first.startTime &&
      first.endTime,
    )

  const secondHasTime =
    Boolean(
      second.startTime &&
      second.endTime,
    )

  if (
    firstHasTime &&
    secondHasTime
  ) {
    const firstStart =
      timeToMinutes(
        first.startTime,
      )

    const firstEnd =
      timeToMinutes(
        first.endTime,
      )

    const secondStart =
      timeToMinutes(
        second.startTime,
      )

    const secondEnd =
      timeToMinutes(
        second.endTime,
      )

    return (
      firstStart <
        secondEnd &&
      firstEnd >
        secondStart
    )
  }

  return (
    Number(
      first.lessonNumber,
    ) ===
    Number(
      second.lessonNumber,
    )
  )
}


/* =========================================================
   SCHOOL FILTER
========================================================= */

function applySchoolFilter(
  query,
  user,
) {
  if (user?.schoolId) {
    return query.eq(
      'school_id',
      user.schoolId,
    )
  }

  if (user?.school) {
    return query.eq(
      'school',
      user.school,
    )
  }

  return query
}


/* =========================================================
   TODAY
========================================================= */

export function getTodayName() {
  const weekday =
    new Date().getDay()

  const names = {
    0: 'Воскресенье',
    1: 'Понедельник',
    2: 'Вторник',
    3: 'Среда',
    4: 'Четверг',
    5: 'Пятница',
    6: 'Суббота',
  }

  return names[weekday]
}


/* =========================================================
   NEXT LESSON
========================================================= */

export function getNextLessonFromSchedule(
  schedule,
) {
  const today =
    getTodayName()

  const now =
    new Date()

  const currentMinutes =
    now.getHours() * 60 +
    now.getMinutes()

  return (
    schedule
      .filter(
        (lesson) =>
          lesson.day ===
          today,
      )
      .filter(
        (lesson) =>
          timeToMinutes(
            lesson.endTime,
          ) >
          currentMinutes,
      )
      .sort(
        (
          firstLesson,
          secondLesson,
        ) =>
          timeToMinutes(
            firstLesson.startTime,
          ) -
          timeToMinutes(
            secondLesson.startTime,
          ),
      )[0] ||
    null
  )
}


/* =========================================================
   NORMALIZE
========================================================= */

function normalizeLesson(
  lesson,
) {
  return {
    id:
      lesson.id,

    school:
      lesson.school ||
      '',

    schoolId:
      lesson.school_id ||
      null,

    className:
      lesson.class_name ||
      '',

    subject:
      lesson.subject ||
      '',

    teacherId:
      lesson.teacher_id ||
      null,

    teacherName:
      lesson.teacher_name ||
      '',

    classroom:
      lesson.room ||
      '',

    room:
      lesson.room ||
      '',

    weekday:
      Number(
        lesson.weekday,
      ),

    day:
      DAYS[
        Number(
          lesson.weekday,
        ) - 1
      ] ||
      'Понедельник',

    lessonNumber:
      Number(
        lesson.lesson_number ||
        1,
      ),

    startTime:
      sliceTime(
        lesson.start_time,
      ),

    endTime:
      sliceTime(
        lesson.end_time,
      ),

    description:
      lesson.description ||
      '',

    createdBy:
      lesson.created_by ||
      null,

    createdAt:
      lesson.created_at ||
      '',
  }
}


/* =========================================================
   VALIDATION
========================================================= */

function validateUserAndLesson(
  lessonData,
  user,
) {
  if (!user?.id) {
    throw new Error(
      'Пользователь не найден',
    )
  }

  if (
    !user?.schoolId &&
    !user?.school
  ) {
    throw new Error(
      'У пользователя не указана школа',
    )
  }

  if (
    !lessonData.className?.trim()
  ) {
    throw new Error(
      'Выберите класс',
    )
  }

  if (
    !lessonData.subject?.trim()
  ) {
    throw new Error(
      'Укажите предмет',
    )
  }
}


function validateLessonTime(
  startTime,
  endTime,
) {
  if (
    !startTime ||
    !endTime
  ) {
    throw new Error(
      'Укажите время начала и окончания урока',
    )
  }

  if (
    timeToMinutes(
      endTime,
    ) <=
    timeToMinutes(
      startTime,
    )
  ) {
    throw new Error(
      'Время окончания должно быть позже времени начала',
    )
  }
}


/* =========================================================
   DAY -> WEEKDAY
========================================================= */

function dayToWeekday(
  day,
) {
  const index =
    DAYS.indexOf(
      day,
    )

  return index >= 0
    ? index + 1
    : 1
}


/* =========================================================
   DATE -> WEEKDAY
========================================================= */

function getWeekdayFromDate(
  value,
) {
  const date =
    new Date(
      `${value}T00:00:00`,
    )

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return null
  }

  const jsDay =
    date.getDay()

  return jsDay === 0
    ? 7
    : jsDay
}


/* =========================================================
   HELPERS
========================================================= */

function sliceTime(
  value,
) {
  return value
    ? String(
        value,
      ).slice(
        0,
        5,
      )
    : ''
}


function timeToMinutes(
  value,
) {
  const [
    hours,
    minutes,
  ] =
    String(
      value ||
      '00:00',
    )
      .split(':')
      .map(Number)

  return (
    hours * 60 +
    minutes
  )
}


function normalizeText(
  value,
) {
  return String(
    value ||
    '',
  )
    .trim()
    .toLowerCase()
}


/* =========================================================
   DATABASE ERRORS
========================================================= */

function throwScheduleDatabaseError(
  error,
) {
  const message =
    String(
      error?.message ||
      '',
    ).toLowerCase()

  if (
    message.includes(
      'row-level security',
    )
  ) {
    throw new Error(
      'Недостаточно прав для изменения расписания',
    )
  }

  throw new Error(
    error?.message ||
      'Не удалось сохранить урок',
  )
}