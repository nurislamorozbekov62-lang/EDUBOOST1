import { supabase } from '../lib/supabase'


const SUBSTITUTION_SELECT = `
  id,
  school_id,
  schedule_lesson_id,
  lesson_date,
  original_teacher_id,
  substitute_teacher_id,
  class_name,
  subject,
  lesson_number,
  start_time,
  end_time,
  room,
  reason,
  notes,
  status,
  created_by,
  created_at,
  updated_at,

  original_teacher:profiles!teacher_substitutions_original_teacher_id_fkey (
    id,
    name,
    role
  ),

  substitute_teacher:profiles!teacher_substitutions_substitute_teacher_id_fkey (
    id,
    name,
    role
  )
`


/* =========================================================
   GET SCHOOL SUBSTITUTIONS
========================================================= */

export async function getSchoolSubstitutions(
  user,
) {
  if (!user?.schoolId) {
    return []
  }

  const {
    data,
    error,
  } = await supabase
    .from(
      'teacher_substitutions',
    )
    .select(
      SUBSTITUTION_SELECT,
    )
    .eq(
      'school_id',
      user.schoolId,
    )
    .order(
      'lesson_date',
      {
        ascending: false,
      },
    )
    .order(
      'lesson_number',
      {
        ascending: true,
      },
    )

  if (error) {
    throw new Error(
      error.message ||
        'Не удалось загрузить замены',
    )
  }

  return (
    data || []
  ).map(
    normalizeSubstitution,
  )
}


/* =========================================================
   GET SUBSTITUTIONS FOR DATE
========================================================= */

export async function getSubstitutionsForDate(
  user,
  date,
) {
  if (
    !user?.schoolId ||
    !date
  ) {
    return []
  }

  const {
    data,
    error,
  } = await supabase
    .from(
      'teacher_substitutions',
    )
    .select(
      SUBSTITUTION_SELECT,
    )
    .eq(
      'school_id',
      user.schoolId,
    )
    .eq(
      'lesson_date',
      date,
    )
    .order(
      'lesson_number',
      {
        ascending: true,
      },
    )

  if (error) {
    throw new Error(
      error.message ||
        'Не удалось загрузить замены на выбранную дату',
    )
  }

  return (
    data || []
  ).map(
    normalizeSubstitution,
  )
}


/* =========================================================
   GET TEACHER SUBSTITUTIONS
========================================================= */

export async function getTeacherSubstitutions(
  user,
) {
  if (
    !user?.schoolId ||
    !user?.id
  ) {
    return []
  }

  const {
    data,
    error,
  } = await supabase
    .from(
      'teacher_substitutions',
    )
    .select(
      SUBSTITUTION_SELECT,
    )
    .eq(
      'school_id',
      user.schoolId,
    )
    .order(
      'lesson_date',
      {
        ascending: false,
      },
    )
    .order(
      'lesson_number',
      {
        ascending: true,
      },
    )

  if (error) {
    throw new Error(
      error.message ||
        'Не удалось загрузить ваши замены',
    )
  }

  return (
    data || []
  ).map(
    normalizeSubstitution,
  )
}


/* =========================================================
   CREATE SUBSTITUTION

   Перед созданием:
   1. проверяем собственное расписание заменяющего;
   2. проверяем другие активные замены;
   3. проверяем, не отсутствует ли этот учитель сам.
========================================================= */

export async function createSubstitution(
  substitutionData,
  user,
) {
  validateSubstitution(
    substitutionData,
  )

  if (!user?.schoolId) {
    throw new Error(
      'У пользователя не указана школа',
    )
  }

  if (!user?.id) {
    throw new Error(
      'Пользователь не найден',
    )
  }

  if (
    substitutionData.status !==
    'cancelled'
  ) {
    await ensureSubstituteAvailable(
      substitutionData,
    )
  }

  const {
    data,
    error,
  } = await supabase
    .from(
      'teacher_substitutions',
    )
    .insert({
      school_id:
        user.schoolId,

      schedule_lesson_id:
        substitutionData.scheduleLessonId,

      lesson_date:
        substitutionData.lessonDate,

      original_teacher_id:
        substitutionData.originalTeacherId,

      substitute_teacher_id:
        substitutionData.substituteTeacherId,

      class_name:
        substitutionData.className.trim(),

      subject:
        substitutionData.subject.trim(),

      lesson_number:
        Number(
          substitutionData.lessonNumber,
        ),

      start_time:
        substitutionData.startTime ||
        null,

      end_time:
        substitutionData.endTime ||
        null,

      room:
        substitutionData.room?.trim() ||
        '',

      reason:
        substitutionData.reason?.trim() ||
        '',

      notes:
        substitutionData.notes?.trim() ||
        '',

      status:
        substitutionData.status ||
        'active',

      created_by:
        user.id,
    })
    .select(
      SUBSTITUTION_SELECT,
    )
    .single()

  if (error) {
    throwDatabaseError(
      error,
    )
  }

  return normalizeSubstitution(
    data,
  )
}


/* =========================================================
   UPDATE SUBSTITUTION
========================================================= */

export async function updateSubstitution(
  substitutionId,
  substitutionData,
) {
  if (!substitutionId) {
    throw new Error(
      'Замена не найдена',
    )
  }

  validateSubstitution(
    substitutionData,
  )

  if (
    substitutionData.status !==
    'cancelled'
  ) {
    await ensureSubstituteAvailable(
      substitutionData,
      substitutionId,
    )
  }

  const {
    data,
    error,
  } = await supabase
    .from(
      'teacher_substitutions',
    )
    .update({
      schedule_lesson_id:
        substitutionData.scheduleLessonId,

      lesson_date:
        substitutionData.lessonDate,

      original_teacher_id:
        substitutionData.originalTeacherId,

      substitute_teacher_id:
        substitutionData.substituteTeacherId,

      class_name:
        substitutionData.className.trim(),

      subject:
        substitutionData.subject.trim(),

      lesson_number:
        Number(
          substitutionData.lessonNumber,
        ),

      start_time:
        substitutionData.startTime ||
        null,

      end_time:
        substitutionData.endTime ||
        null,

      room:
        substitutionData.room?.trim() ||
        '',

      reason:
        substitutionData.reason?.trim() ||
        '',

      notes:
        substitutionData.notes?.trim() ||
        '',

      status:
        substitutionData.status ||
        'active',

      updated_at:
        new Date().toISOString(),
    })
    .eq(
      'id',
      substitutionId,
    )
    .select(
      SUBSTITUTION_SELECT,
    )
    .single()

  if (error) {
    throwDatabaseError(
      error,
    )
  }

  return normalizeSubstitution(
    data,
  )
}


/* =========================================================
   CHANGE STATUS

   При возврате в active снова проверяем,
   свободен ли заменяющий учитель.
========================================================= */

export async function updateSubstitutionStatus(
  substitutionId,
  status,
) {
  if (!substitutionId) {
    throw new Error(
      'Замена не найдена',
    )
  }

  const allowedStatuses = [
    'active',
    'cancelled',
    'completed',
  ]

  if (
    !allowedStatuses.includes(
      status,
    )
  ) {
    throw new Error(
      'Некорректный статус замены',
    )
  }

  if (
    status ===
    'active'
  ) {
    const current =
      await getRawSubstitution(
        substitutionId,
      )

    if (!current) {
      throw new Error(
        'Замена не найдена',
      )
    }

    await ensureSubstituteAvailable(
      {
        scheduleLessonId:
          current.schedule_lesson_id,

        lessonDate:
          current.lesson_date,

        originalTeacherId:
          current.original_teacher_id,

        substituteTeacherId:
          current.substitute_teacher_id,

        className:
          current.class_name,

        subject:
          current.subject,

        lessonNumber:
          current.lesson_number,

        startTime:
          sliceTime(
            current.start_time,
          ),

        endTime:
          sliceTime(
            current.end_time,
          ),

        room:
          current.room,

        status:
          'active',
      },
      substitutionId,
    )
  }

  const {
    data,
    error,
  } = await supabase
    .from(
      'teacher_substitutions',
    )
    .update({
      status,

      updated_at:
        new Date().toISOString(),
    })
    .eq(
      'id',
      substitutionId,
    )
    .select(
      SUBSTITUTION_SELECT,
    )
    .single()

  if (error) {
    throwDatabaseError(
      error,
    )
  }

  return normalizeSubstitution(
    data,
  )
}


/* =========================================================
   DELETE
========================================================= */

export async function deleteSubstitution(
  substitutionId,
) {
  if (!substitutionId) {
    throw new Error(
      'Замена не найдена',
    )
  }

  const {
    error,
  } = await supabase
    .from(
      'teacher_substitutions',
    )
    .delete()
    .eq(
      'id',
      substitutionId,
    )

  if (error) {
    throw new Error(
      error.message ||
        'Не удалось удалить замену',
    )
  }

  return true
}


/* =========================================================
   AVAILABILITY CHECK

   Здесь основная логика конфликтов.
========================================================= */

async function ensureSubstituteAvailable(
  substitutionData,
  ignoreSubstitutionId = null,
) {
  const teacherId =
    substitutionData.substituteTeacherId

  const lessonDate =
    substitutionData.lessonDate

  const lessonNumber =
    Number(
      substitutionData.lessonNumber,
    )

  if (
    !teacherId ||
    !lessonDate
  ) {
    return
  }

  const weekday =
    getWeekdayFromDate(
      lessonDate,
    )

  if (!weekday) {
    return
  }


  /* -------------------------------------------------------
     1. Проверяем собственное расписание учителя
  ------------------------------------------------------- */

  const {
    data: scheduleData,
    error: scheduleError,
  } = await supabase
    .from(
      'schedule_lessons',
    )
    .select(`
      id,
      class_name,
      subject,
      lesson_number,
      start_time,
      end_time,
      room
    `)
    .eq(
      'teacher_id',
      teacherId,
    )
    .eq(
      'weekday',
      weekday,
    )

  if (scheduleError) {
    throw new Error(
      scheduleError.message ||
        'Не удалось проверить занятость учителя',
    )
  }


  const scheduleConflict =
    (
      scheduleData ||
      []
    ).find(
      (lesson) =>
        lessonsConflict(
          {
            lessonNumber:
              lessonNumber,

            startTime:
              substitutionData.startTime,

            endTime:
              substitutionData.endTime,
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


  if (scheduleConflict) {
    throw new Error(
      `Учитель занят: ${scheduleConflict.class_name} · ${scheduleConflict.subject} · урок №${scheduleConflict.lesson_number}`,
    )
  }


  /* -------------------------------------------------------
     2. Получаем активные замены на эту дату

     Проверяем:
     - учитель уже заменяет кого-то;
     - самого этого учителя уже заменяют.
  ------------------------------------------------------- */

  const {
    data: substitutionDataList,
    error: substitutionsError,
  } = await supabase
    .from(
      'teacher_substitutions',
    )
    .select(`
      id,
      original_teacher_id,
      substitute_teacher_id,
      class_name,
      subject,
      lesson_number,
      start_time,
      end_time,
      status
    `)
    .eq(
      'lesson_date',
      lessonDate,
    )
    .eq(
      'status',
      'active',
    )

  if (substitutionsError) {
    throw new Error(
      substitutionsError.message ||
        'Не удалось проверить существующие замены',
    )
  }


  const activeSubstitutions =
    (
      substitutionDataList ||
      []
    ).filter(
      (item) =>
        item.id !==
        ignoreSubstitutionId,
    )


  /* -------------------------------------------------------
     3. Если этого учителя самого заменяют,
     значит он считается отсутствующим.
  ------------------------------------------------------- */

  const teacherIsAbsent =
    activeSubstitutions.find(
      (item) =>
        item.original_teacher_id ===
        teacherId,
    )


  if (teacherIsAbsent) {
    throw new Error(
      `Нельзя назначить этого учителя: он сам отсутствует и уже заменяется в ${teacherIsAbsent.class_name}`,
    )
  }


  /* -------------------------------------------------------
     4. Проверяем другие замены этого же учителя
  ------------------------------------------------------- */

  const substitutionConflict =
    activeSubstitutions.find(
      (item) =>
        item.substitute_teacher_id ===
          teacherId &&
        lessonsConflict(
          {
            lessonNumber,

            startTime:
              substitutionData.startTime,

            endTime:
              substitutionData.endTime,
          },
          {
            lessonNumber:
              Number(
                item.lesson_number,
              ),

            startTime:
              sliceTime(
                item.start_time,
              ),

            endTime:
              sliceTime(
                item.end_time,
              ),
          },
        ),
    )


  if (substitutionConflict) {
    throw new Error(
      `Учитель уже назначен на другую замену: ${substitutionConflict.class_name} · ${substitutionConflict.subject} · урок №${substitutionConflict.lesson_number}`,
    )
  }
}


/* =========================================================
   CONFLICT LOGIC

   Если есть время — проверяем пересечение времени.

   Если времени нет — сравниваем номер урока.
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
   GET RAW SUBSTITUTION
========================================================= */

async function getRawSubstitution(
  substitutionId,
) {
  const {
    data,
    error,
  } = await supabase
    .from(
      'teacher_substitutions',
    )
    .select(`
      id,
      schedule_lesson_id,
      lesson_date,
      original_teacher_id,
      substitute_teacher_id,
      class_name,
      subject,
      lesson_number,
      start_time,
      end_time,
      room,
      status
    `)
    .eq(
      'id',
      substitutionId,
    )
    .maybeSingle()

  if (error) {
    throw new Error(
      error.message ||
        'Не удалось загрузить замену',
    )
  }

  return data ||
    null
}


/* =========================================================
   NORMALIZE
========================================================= */

function normalizeSubstitution(
  item,
) {
  return {
    id:
      item.id,

    schoolId:
      item.school_id,

    scheduleLessonId:
      item.schedule_lesson_id ||
      null,

    lessonDate:
      item.lesson_date,

    originalTeacherId:
      item.original_teacher_id,

    originalTeacherName:
      item.original_teacher?.name ||
      '',

    substituteTeacherId:
      item.substitute_teacher_id,

    substituteTeacherName:
      item.substitute_teacher?.name ||
      '',

    className:
      item.class_name ||
      '',

    subject:
      item.subject ||
      '',

    lessonNumber:
      Number(
        item.lesson_number ||
          1,
      ),

    startTime:
      sliceTime(
        item.start_time,
      ),

    endTime:
      sliceTime(
        item.end_time,
      ),

    room:
      item.room ||
      '',

    reason:
      item.reason ||
      '',

    notes:
      item.notes ||
      '',

    status:
      item.status ||
      'active',

    createdBy:
      item.created_by ||
      null,

    createdAt:
      item.created_at ||
      '',

    updatedAt:
      item.updated_at ||
      '',
  }
}


/* =========================================================
   VALIDATION
========================================================= */

function validateSubstitution(
  data,
) {
  if (!data.lessonDate) {
    throw new Error(
      'Выберите дату замены',
    )
  }

  if (
    !data.scheduleLessonId
  ) {
    throw new Error(
      'Выберите урок из расписания',
    )
  }

  if (
    !data.originalTeacherId
  ) {
    throw new Error(
      'У выбранного урока не указан учитель',
    )
  }

  if (
    !data.substituteTeacherId
  ) {
    throw new Error(
      'Выберите заменяющего учителя',
    )
  }

  if (
    data.originalTeacherId ===
    data.substituteTeacherId
  ) {
    throw new Error(
      'Учитель не может заменить сам себя',
    )
  }

  if (
    !data.className?.trim()
  ) {
    throw new Error(
      'У урока не указан класс',
    )
  }

  if (
    !data.subject?.trim()
  ) {
    throw new Error(
      'У урока не указан предмет',
    )
  }

  const lessonNumber =
    Number(
      data.lessonNumber,
    )

  if (
    !Number.isInteger(
      lessonNumber,
    ) ||
    lessonNumber < 1 ||
    lessonNumber > 12
  ) {
    throw new Error(
      'Некорректный номер урока',
    )
  }

  if (
    data.startTime &&
    data.endTime &&
    timeToMinutes(
      data.endTime,
    ) <=
      timeToMinutes(
        data.startTime,
      )
  ) {
    throw new Error(
      'Время окончания должно быть позже времени начала',
    )
  }
}


/* =========================================================
   DATABASE ERRORS
========================================================= */

function throwDatabaseError(
  error,
) {
  const message =
    String(
      error?.message ||
      '',
    ).toLowerCase()

  if (
    message.includes(
      'duplicate',
    ) ||
    message.includes(
      'unique',
    )
  ) {
    throw new Error(
      'На этот урок уже назначена активная замена',
    )
  }

  if (
    message.includes(
      'row-level security',
    )
  ) {
    throw new Error(
      'Недостаточно прав для управления заменами',
    )
  }

  throw new Error(
    error?.message ||
      'Не удалось сохранить замену',
  )
}


/* =========================================================
   DATE -> WEEKDAY

   PostgreSQL расписание:
   1 = Понедельник
   ...
   7 = Воскресенье
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
   TIME
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