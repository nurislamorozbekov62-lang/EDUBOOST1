import {
  supabase,
} from '../lib/supabase'


export const ATTENDANCE_STATUSES = [
  {
    value:
      'present',

    label:
      'Присутствовал',
  },

  {
    value:
      'absent',

    label:
      'Отсутствовал',
  },

  {
    value:
      'late',

    label:
      'Опоздал',
  },

  {
    value:
      'excused',

    label:
      'Уважительная причина',
  },
]


/* ========================================
   SAVE
======================================== */

export async function saveSupabaseAttendanceRecord(
  teacher,
  student,
  form,
) {
  if (
    !teacher?.id
  ) {
    throw new Error(
      'Учитель не авторизован.',
    )
  }

  if (
    !student?.id
  ) {
    throw new Error(
      'Ученик не выбран.',
    )
  }

  if (
    !form?.subject
  ) {
    throw new Error(
      'Выберите предмет.',
    )
  }


  const status =
    normalizeAttendanceStatus(
      form.status,
    )


  const attendanceDate =
    form.date ||
    getToday()


  const journalLessonId =
    form.journalLessonId ||
    null


  const payload = {
    student_id:
      student.id,

    subject:
      form.subject,

    status,

    comment:
      String(
        form.comment ||
          '',
      ).trim(),

    attendance_date:
      attendanceDate,

    journal_lesson_id:
      journalLessonId,
  }


  /*
    Если запись идёт из карточки урока,
    уникальность строим по:

    student_id + journal_lesson_id

    Старые страницы продолжают работать
    по старому ключу:
    student_id + subject + attendance_date
  */

  const conflictKey =
    journalLessonId
      ? 'student_id,journal_lesson_id'
      : 'student_id,subject,attendance_date'


  const {
    data,
    error,
  } =
    await supabase
      .from(
        'attendance_records',
      )
      .upsert(
        payload,
        {
          onConflict:
            conflictKey,
        },
      )
      .select('*')
      .single()


  if (
    error
  ) {
    throw new Error(
      error.message ||
        'Не удалось сохранить посещаемость.',
    )
  }


  return normalizeAttendanceRecord(
    data,
  )
}


/* ========================================
   UPDATE
======================================== */

export async function updateSupabaseAttendanceRecord(
  recordId,
  form,
) {
  if (
    !recordId
  ) {
    throw new Error(
      'Не найдена запись посещаемости.',
    )
  }


  const updateData = {
    status:
      normalizeAttendanceStatus(
        form.status,
      ),

    comment:
      String(
        form.comment ||
          '',
      ).trim(),

    updated_at:
      new Date()
        .toISOString(),
  }


  if (
    form.subject !==
    undefined
  ) {
    updateData.subject =
      form.subject
  }


  if (
    form.date !==
    undefined
  ) {
    updateData.attendance_date =
      form.date
  }


  if (
    form.journalLessonId !==
    undefined
  ) {
    updateData.journal_lesson_id =
      form.journalLessonId ||
      null
  }


  const {
    data,
    error,
  } =
    await supabase
      .from(
        'attendance_records',
      )
      .update(
        updateData,
      )
      .eq(
        'id',
        recordId,
      )
      .select('*')
      .single()


  if (
    error
  ) {
    throw new Error(
      error.message ||
        'Не удалось изменить посещаемость.',
    )
  }


  return normalizeAttendanceRecord(
    data,
  )
}


/* ========================================
   DELETE
======================================== */

export async function deleteSupabaseAttendanceRecord(
  recordId,
) {
  if (
    !recordId
  ) {
    return
  }


  const {
    error,
  } =
    await supabase
      .from(
        'attendance_records',
      )
      .delete()
      .eq(
        'id',
        recordId,
      )


  if (
    error
  ) {
    throw new Error(
      error.message ||
        'Не удалось удалить посещаемость.',
    )
  }
}


/* ========================================
   STUDENT
======================================== */

export async function getSupabaseStudentAttendance(
  studentId,
) {
  if (
    !studentId
  ) {
    return []
  }


  const {
    data,
    error,
  } =
    await supabase
      .from(
        'attendance_records',
      )
      .select('*')
      .eq(
        'student_id',
        studentId,
      )
      .order(
        'attendance_date',
        {
          ascending:
            false,
        },
      )
      .order(
        'created_at',
        {
          ascending:
            false,
        },
      )


  if (
    error
  ) {
    throw new Error(
      error.message ||
        'Не удалось загрузить посещаемость ученика.',
    )
  }


  return (
    data ||
    []
  ).map(
    normalizeAttendanceRecord,
  )
}


/* ========================================
   CLASS ATTENDANCE
======================================== */

export async function getSupabaseClassAttendance({
  teacher,
  className,
  subject = '',
  dateFrom = '',
  dateTo = '',
}) {
  if (
    !teacher ||
    !className
  ) {
    return []
  }


  let query =
    supabase
      .from(
        'attendance_records',
      )
      .select('*')
      .eq(
        'class_name',
        className,
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


  if (
    subject
  ) {
    query =
      query.eq(
        'subject',
        subject,
      )
  }


  if (
    dateFrom
  ) {
    query =
      query.gte(
        'attendance_date',
        dateFrom,
      )
  }


  if (
    dateTo
  ) {
    query =
      query.lte(
        'attendance_date',
        dateTo,
      )
  }


  const {
    data,
    error,
  } =
    await query
      .order(
        'attendance_date',
        {
          ascending:
            true,
        },
      )
      .order(
        'created_at',
        {
          ascending:
            true,
        },
      )


  if (
    error
  ) {
    throw new Error(
      error.message ||
        'Не удалось загрузить посещаемость класса.',
    )
  }


  return (
    data ||
    []
  ).map(
    normalizeAttendanceRecord,
  )
}


/* ========================================
   ONE JOURNAL LESSON
======================================== */

export async function getSupabaseAttendanceForJournalLesson(
  journalLessonId,
) {
  if (
    !journalLessonId
  ) {
    return []
  }


  const {
    data,
    error,
  } =
    await supabase
      .from(
        'attendance_records',
      )
      .select('*')
      .eq(
        'journal_lesson_id',
        journalLessonId,
      )
      .order(
        'created_at',
        {
          ascending:
            true,
        },
      )


  if (
    error
  ) {
    throw new Error(
      error.message ||
        'Не удалось загрузить посещаемость урока.',
    )
  }


  return (
    data ||
    []
  ).map(
    normalizeAttendanceRecord,
  )
}


/* ========================================
   SAVE FOR JOURNAL LESSON
======================================== */

export async function saveSupabaseJournalLessonAttendance({
  teacher,
  student,
  lesson,
  status,
  comment = '',
}) {
  if (
    !lesson?.id
  ) {
    throw new Error(
      'Урок не найден.',
    )
  }


  return saveSupabaseAttendanceRecord(
    teacher,
    student,
    {
      subject:
        lesson.subject,

      date:
        lesson.date,

      status,

      comment,

      journalLessonId:
        lesson.id,
    },
  )
}


/* ========================================
   STATS
======================================== */

export function calculateSupabaseAttendanceStats(
  records,
) {
  const safeRecords =
    Array.isArray(
      records,
    )
      ? records
      : []


  const present =
    safeRecords.filter(
      (
        record,
      ) =>
        record.status ===
        'present',
    ).length


  const absent =
    safeRecords.filter(
      (
        record,
      ) =>
        record.status ===
        'absent',
    ).length


  const late =
    safeRecords.filter(
      (
        record,
      ) =>
        record.status ===
        'late',
    ).length


  const excused =
    safeRecords.filter(
      (
        record,
      ) =>
        record.status ===
        'excused',
    ).length


  const total =
    safeRecords.length


  const attended =
    present +
    late +
    excused


  const percent =
    total ===
    0
      ? 0
      : Math.round(
          (
            attended /
            total
          ) *
            100,
        )


  return {
    total,

    present,

    absent,

    late,

    excused,

    percent,
  }
}


/* ========================================
   STATUS LABEL
======================================== */

export function getAttendanceStatusLabel(
  status,
) {
  const item =
    ATTENDANCE_STATUSES.find(
      (
        attendanceStatus,
      ) =>
        attendanceStatus.value ===
        status,
    )


  return (
    item?.label ||
    'Не указан'
  )
}


/* ========================================
   HELPERS
======================================== */

function normalizeAttendanceStatus(
  value,
) {
  const status =
    String(
      value ||
        'present',
    )
      .trim()
      .toLowerCase()


  const exists =
    ATTENDANCE_STATUSES.some(
      (
        item,
      ) =>
        item.value ===
        status,
    )


  return exists
    ? status
    : 'present'
}


function getToday() {
  const now =
    new Date()

  const local =
    new Date(
      now.getTime() -
        now.getTimezoneOffset() *
          60000,
    )

  return local
    .toISOString()
    .slice(
      0,
      10,
    )
}


/* ========================================
   NORMALIZE
======================================== */

function normalizeAttendanceRecord(
  record,
) {
  return {
    id:
      record.id,

    school:
      record.school,

    schoolId:
      record.school_id,

    className:
      record.class_name,

    subject:
      record.subject,

    studentId:
      record.student_id,

    teacherId:
      record.teacher_id,

    teacherName:
      record.teacher_name ||
      '',

    status:
      record.status,

    comment:
      record.comment ||
      '',

    date:
      record.attendance_date,

    journalLessonId:
      record.journal_lesson_id,

    createdAt:
      record.created_at,

    updatedAt:
      record.updated_at,
  }
}