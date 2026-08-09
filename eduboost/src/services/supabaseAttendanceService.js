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
    new Date()
      .toISOString()
      .slice(
        0,
        10,
      )

  const {
    data,
    error,
  } =
    await supabase
      .from(
        'attendance_records',
      )
      .upsert(
        {
          student_id:
            student.id,

          subject:
            form.subject,

          status,

          comment:
            form.comment
              ?.trim() ||
            '',

          attendance_date:
            attendanceDate,
        },
        {
          onConflict:
            'student_id,subject,attendance_date',
        },
      )
      .select('*')
      .single()

  if (error) {
    throw new Error(
      error.message ||
        'Не удалось сохранить посещаемость.',
    )
  }

  return normalizeAttendanceRecord(
    data,
  )
}


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

  const status =
    normalizeAttendanceStatus(
      form.status,
    )

  const updateData = {
    status,

    comment:
      form.comment
        ?.trim() ||
      '',

    updated_at:
      new Date()
        .toISOString(),
  }


  if (
    form.subject
  ) {
    updateData.subject =
      form.subject
  }


  if (
    form.date
  ) {
    updateData.attendance_date =
      form.date
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

  if (error) {
    throw new Error(
      error.message ||
        'Не удалось изменить посещаемость.',
    )
  }

  return normalizeAttendanceRecord(
    data,
  )
}


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

  if (error) {
    throw new Error(
      error.message ||
        'Не удалось удалить посещаемость.',
    )
  }
}


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

  if (error) {
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


export async function getSupabaseClassAttendance({
  teacher,
  className,
  subject = '',
  dateFrom = '',
  dateTo = '',
}) {
  if (
    !teacher?.school ||
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
        'school',
        teacher.school,
      )
      .eq(
        'class_name',
        className,
      )


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

  if (error) {
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
    total === 0
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


function normalizeAttendanceRecord(
  record,
) {
  return {
    id:
      record.id,

    school:
      record.school,

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

    createdAt:
      record.created_at,

    updatedAt:
      record.updated_at,
  }
}