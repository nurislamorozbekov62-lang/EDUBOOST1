import { supabase } from '../lib/supabase'


/* ========================================
   GET LESSONS
======================================== */

export async function getSupabaseJournalLessons({
  teacher,
  className,
  subject,
  quarter,
}) {
  if (
    !teacher ||
    !className ||
    !subject ||
    !quarter
  ) {
    return []
  }


  let query =
    supabase
      .from('journal_lessons')
      .select('*')
      .eq(
        'class_name',
        className,
      )
      .eq(
        'subject',
        subject,
      )
      .eq(
        'quarter',
        Number(
          quarter,
        ),
      )
      .order(
        'lesson_date',
        {
          ascending:
            true,
        },
      )


  if (
    teacher.schoolId
  ) {
    query =
      query.eq(
        'school_id',
        teacher.schoolId,
      )
  } else if (
    teacher.school
  ) {
    query =
      query.eq(
        'school',
        teacher.school,
      )
  } else {
    return []
  }


  const {
    data,
    error,
  } =
    await query


  if (
    error
  ) {
    throw new Error(
      error.message ||
        'Не удалось загрузить уроки журнала.',
    )
  }


  return (
    data ||
    []
  ).map(
    normalizeLesson,
  )
}


/* ========================================
   GET ONE LESSON
======================================== */

export async function getSupabaseJournalLessonById(
  lessonId,
) {
  if (
    !lessonId
  ) {
    return null
  }


  const {
    data,
    error,
  } =
    await supabase
      .from('journal_lessons')
      .select('*')
      .eq(
        'id',
        lessonId,
      )
      .maybeSingle()


  if (
    error
  ) {
    throw new Error(
      error.message ||
        'Не удалось загрузить урок.',
    )
  }


  return data
    ? normalizeLesson(
        data,
      )
    : null
}


/* ========================================
   GET LESSON BY SCHEDULE + DATE
======================================== */

export async function getSupabaseJournalLessonBySchedule({
  scheduleLessonId,
  date,
}) {
  if (
    !scheduleLessonId ||
    !date
  ) {
    return null
  }


  const {
    data,
    error,
  } =
    await supabase
      .from('journal_lessons')
      .select('*')
      .eq(
        'schedule_lesson_id',
        scheduleLessonId,
      )
      .eq(
        'lesson_date',
        date,
      )
      .maybeSingle()


  if (
    error
  ) {
    throw new Error(
      error.message ||
        'Не удалось найти урок по расписанию.',
    )
  }


  return data
    ? normalizeLesson(
        data,
      )
    : null
}


/* ========================================
   CREATE / UPSERT LESSON
======================================== */

export async function createSupabaseJournalLesson({
  teacher,
  className,
  subject,
  quarter,
  date,
  topic = '',
  scheduleLessonId = null,
}) {
  if (
    !teacher?.id
  ) {
    throw new Error(
      'Учитель не авторизован.',
    )
  }


  if (
    !teacher.school &&
    !teacher.schoolId
  ) {
    throw new Error(
      'Не удалось определить школу учителя.',
    )
  }


  if (
    !className
  ) {
    throw new Error(
      'Выберите класс.',
    )
  }


  if (
    !subject
  ) {
    throw new Error(
      'Выберите предмет.',
    )
  }


  if (
    !quarter
  ) {
    throw new Error(
      'Выберите четверть.',
    )
  }


  if (
    !date
  ) {
    throw new Error(
      'Выберите дату урока.',
    )
  }


  /*
    Если урок создаётся из расписания,
    сначала проверяем, не существует ли
    уже фактический урок для этой строки
    расписания на эту дату.
  */

  if (
    scheduleLessonId
  ) {
    const existingLesson =
      await getSupabaseJournalLessonBySchedule({
        scheduleLessonId,
        date,
      })


    if (
      existingLesson
    ) {
      return updateSupabaseJournalLesson(
        existingLesson.id,
        {
          topic,

          teacherId:
            teacher.id,

          schoolId:
            teacher.schoolId,

          scheduleLessonId,
        },
      )
    }
  }


  const payload = {
    school:
      teacher.school ||
      null,

    school_id:
      teacher.schoolId ||
      null,

    class_name:
      className,

    subject,

    quarter:
      Number(
        quarter,
      ),

    lesson_date:
      date,

    topic:
      String(
        topic ||
          '',
      ).trim(),

    teacher_id:
      teacher.id,

    schedule_lesson_id:
      scheduleLessonId ||
      null,

    updated_at:
      new Date()
        .toISOString(),
  }


  const {
    data,
    error,
  } =
    await supabase
      .from('journal_lessons')
      .upsert(
        payload,
        {
          /*
            Старый журнал уже использует
            этот уникальный ключ.

            Пока сохраняем его, чтобы не
            сломать существующие страницы.
          */
          onConflict:
            'school,class_name,subject,quarter,lesson_date',
        },
      )
      .select('*')
      .single()


  if (
    error
  ) {
    throw new Error(
      error.message ||
        'Не удалось создать урок.',
    )
  }


  return normalizeLesson(
    data,
  )
}


/* ========================================
   UPDATE LESSON
======================================== */

export async function updateSupabaseJournalLesson(
  lessonId,
  lessonData = {},
) {
  if (
    !lessonId
  ) {
    throw new Error(
      'Урок не найден.',
    )
  }


  const payload = {
    updated_at:
      new Date()
        .toISOString(),
  }


  if (
    lessonData.topic !==
    undefined
  ) {
    payload.topic =
      String(
        lessonData.topic ||
          '',
      ).trim()
  }


  if (
    lessonData.className !==
    undefined
  ) {
    payload.class_name =
      lessonData.className
  }


  if (
    lessonData.subject !==
    undefined
  ) {
    payload.subject =
      lessonData.subject
  }


  if (
    lessonData.quarter !==
    undefined
  ) {
    payload.quarter =
      Number(
        lessonData.quarter,
      )
  }


  if (
    lessonData.date !==
    undefined
  ) {
    payload.lesson_date =
      lessonData.date
  }


  if (
    lessonData.teacherId !==
    undefined
  ) {
    payload.teacher_id =
      lessonData.teacherId ||
      null
  }


  if (
    lessonData.school !==
    undefined
  ) {
    payload.school =
      lessonData.school ||
      null
  }


  if (
    lessonData.schoolId !==
    undefined
  ) {
    payload.school_id =
      lessonData.schoolId ||
      null
  }


  if (
    lessonData.scheduleLessonId !==
    undefined
  ) {
    payload.schedule_lesson_id =
      lessonData.scheduleLessonId ||
      null
  }


  const {
    data,
    error,
  } =
    await supabase
      .from('journal_lessons')
      .update(
        payload,
      )
      .eq(
        'id',
        lessonId,
      )
      .select('*')
      .single()


  if (
    error
  ) {
    throw new Error(
      error.message ||
        'Не удалось обновить урок.',
    )
  }


  return normalizeLesson(
    data,
  )
}


/* ========================================
   UPDATE TOPIC
======================================== */

export async function updateSupabaseJournalLessonTopic(
  lessonId,
  topic,
) {
  return updateSupabaseJournalLesson(
    lessonId,
    {
      topic:
        topic ||
        '',
    },
  )
}


/* ========================================
   ATTACH SCHEDULE LESSON
======================================== */

export async function attachScheduleLessonToJournalLesson(
  journalLessonId,
  scheduleLessonId,
) {
  if (
    !journalLessonId
  ) {
    throw new Error(
      'Урок журнала не найден.',
    )
  }


  return updateSupabaseJournalLesson(
    journalLessonId,
    {
      scheduleLessonId:
        scheduleLessonId ||
        null,
    },
  )
}


/* ========================================
   DELETE
======================================== */

export async function deleteSupabaseJournalLesson(
  lessonId,
) {
  if (
    !lessonId
  ) {
    return
  }


  const {
    error,
  } =
    await supabase
      .from('journal_lessons')
      .delete()
      .eq(
        'id',
        lessonId,
      )


  if (
    error
  ) {
    throw new Error(
      error.message ||
        'Не удалось удалить урок.',
    )
  }
}


/* ========================================
   NORMALIZE
======================================== */

function normalizeLesson(
  lesson,
) {
  return {
    id:
      lesson.id,

    school:
      lesson.school,

    schoolId:
      lesson.school_id,

    scheduleLessonId:
      lesson.schedule_lesson_id,

    className:
      lesson.class_name,

    subject:
      lesson.subject,

    quarter:
      Number(
        lesson.quarter,
      ),

    date:
      lesson.lesson_date,

    topic:
      lesson.topic ||
      '',

    teacherId:
      lesson.teacher_id,

    createdAt:
      lesson.created_at,

    updatedAt:
      lesson.updated_at,
  }
}