import { supabase } from '../lib/supabase'


/* =========================================================
   GET SCHOOL TEACHERS

   Получаем настоящих учителей текущей школы.
   Используется в форме назначения нагрузки.
   ========================================================= */

export async function getSchoolTeachers(
  user,
) {
  if (!user?.schoolId) {
    return []
  }

  const {
    data,
    error,
  } = await supabase
    .from('profiles')
    .select(`
      id,
      name,
      role,
      position,
      school_id
    `)
    .eq(
      'school_id',
      user.schoolId,
    )
    .eq(
      'role',
      'Учитель',
    )
    .order(
      'name',
      {
        ascending: true,
      },
    )

  if (error) {
    throw new Error(
      error.message ||
        'Не удалось загрузить учителей',
    )
  }

  return (
    data || []
  ).map(
    normalizeTeacher,
  )
}


/* =========================================================
   GET SCHOOL WORKLOADS

   Для Завуча / Директора /
   Администратора школы.
   ========================================================= */

export async function getSchoolWorkloads(
  user,
) {
  if (!user?.schoolId) {
    return []
  }

  const {
    data,
    error,
  } = await supabase
    .from('teacher_workloads')
    .select(`
      id,
      school_id,
      teacher_id,
      class_name,
      subject,
      weekly_hours,
      group_name,
      academic_year,
      notes,
      created_by,
      created_at,
      updated_at,
      teacher:profiles!teacher_workloads_teacher_id_fkey (
        id,
        name,
        role
      )
    `)
    .eq(
      'school_id',
      user.schoolId,
    )
    .order(
      'class_name',
      {
        ascending: true,
      },
    )
    .order(
      'subject',
      {
        ascending: true,
      },
    )

  if (error) {
    throw new Error(
      error.message ||
        'Не удалось загрузить нагрузку учителей',
    )
  }

  return (
    data || []
  ).map(
    normalizeWorkload,
  )
}


/* =========================================================
   GET TEACHER WORKLOAD

   Учитель получает только свою нагрузку.
   RLS дополнительно защищает запрос.
   ========================================================= */

export async function getTeacherWorkloads(
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
    .from('teacher_workloads')
    .select(`
      id,
      school_id,
      teacher_id,
      class_name,
      subject,
      weekly_hours,
      group_name,
      academic_year,
      notes,
      created_by,
      created_at,
      updated_at
    `)
    .eq(
      'school_id',
      user.schoolId,
    )
    .eq(
      'teacher_id',
      user.id,
    )
    .order(
      'class_name',
      {
        ascending: true,
      },
    )
    .order(
      'subject',
      {
        ascending: true,
      },
    )

  if (error) {
    throw new Error(
      error.message ||
        'Не удалось загрузить вашу учебную нагрузку',
    )
  }

  return (
    data || []
  ).map(
    normalizeWorkload,
  )
}


/* =========================================================
   CREATE WORKLOAD

   Завуч:
   Учитель -> Предмет -> Класс -> Часы
   ========================================================= */

export async function createWorkload(
  workloadData,
  user,
) {
  validateWorkload(
    workloadData,
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

  const {
    data,
    error,
  } = await supabase
    .from('teacher_workloads')
    .insert({
      school_id:
        user.schoolId,

      teacher_id:
        workloadData.teacherId,

      class_name:
        workloadData.className.trim(),

      subject:
        workloadData.subject.trim(),

      weekly_hours:
        Number(
          workloadData.weeklyHours,
        ),

      group_name:
        workloadData.groupName?.trim() ||
        '',

      academic_year:
        workloadData.academicYear?.trim() ||
        '',

      notes:
        workloadData.notes?.trim() ||
        '',

      created_by:
        user.id,
    })
    .select(`
      id,
      school_id,
      teacher_id,
      class_name,
      subject,
      weekly_hours,
      group_name,
      academic_year,
      notes,
      created_by,
      created_at,
      updated_at,
      teacher:profiles!teacher_workloads_teacher_id_fkey (
        id,
        name,
        role
      )
    `)
    .single()

  if (error) {
    if (
      String(
        error.message,
      )
        .toLowerCase()
        .includes(
          'duplicate',
        )
    ) {
      throw new Error(
        'Такая нагрузка уже назначена этому учителю',
      )
    }

    throw new Error(
      error.message ||
        'Не удалось добавить нагрузку',
    )
  }

  return normalizeWorkload(
    data,
  )
}


/* =========================================================
   UPDATE WORKLOAD
   ========================================================= */

export async function updateWorkload(
  workloadId,
  workloadData,
) {
  if (!workloadId) {
    throw new Error(
      'Нагрузка не найдена',
    )
  }

  validateWorkload(
    workloadData,
  )

  const {
    data,
    error,
  } = await supabase
    .from('teacher_workloads')
    .update({
      teacher_id:
        workloadData.teacherId,

      class_name:
        workloadData.className.trim(),

      subject:
        workloadData.subject.trim(),

      weekly_hours:
        Number(
          workloadData.weeklyHours,
        ),

      group_name:
        workloadData.groupName?.trim() ||
        '',

      academic_year:
        workloadData.academicYear?.trim() ||
        '',

      notes:
        workloadData.notes?.trim() ||
        '',

      updated_at:
        new Date().toISOString(),
    })
    .eq(
      'id',
      workloadId,
    )
    .select(`
      id,
      school_id,
      teacher_id,
      class_name,
      subject,
      weekly_hours,
      group_name,
      academic_year,
      notes,
      created_by,
      created_at,
      updated_at,
      teacher:profiles!teacher_workloads_teacher_id_fkey (
        id,
        name,
        role
      )
    `)
    .single()

  if (error) {
    if (
      String(
        error.message,
      )
        .toLowerCase()
        .includes(
          'duplicate',
        )
    ) {
      throw new Error(
        'Такая нагрузка уже существует',
      )
    }

    throw new Error(
      error.message ||
        'Не удалось изменить нагрузку',
    )
  }

  return normalizeWorkload(
    data,
  )
}


/* =========================================================
   DELETE WORKLOAD
   ========================================================= */

export async function deleteWorkload(
  workloadId,
) {
  if (!workloadId) {
    throw new Error(
      'Нагрузка не найдена',
    )
  }

  const {
    error,
  } = await supabase
    .from('teacher_workloads')
    .delete()
    .eq(
      'id',
      workloadId,
    )

  if (error) {
    throw new Error(
      error.message ||
        'Не удалось удалить нагрузку',
    )
  }

  return true
}


/* =========================================================
   GET WORKLOAD BY CLASS

   Потом это подключим к расписанию:
   выбрали класс -> получаем предметы и учителей.
   ========================================================= */

export async function getWorkloadsForClass(
  user,
  className,
) {
  if (
    !user?.schoolId ||
    !className
  ) {
    return []
  }

  const {
    data,
    error,
  } = await supabase
    .from('teacher_workloads')
    .select(`
      id,
      school_id,
      teacher_id,
      class_name,
      subject,
      weekly_hours,
      group_name,
      academic_year,
      notes,
      teacher:profiles!teacher_workloads_teacher_id_fkey (
        id,
        name,
        role
      )
    `)
    .eq(
      'school_id',
      user.schoolId,
    )
    .eq(
      'class_name',
      className,
    )
    .order(
      'subject',
      {
        ascending: true,
      },
    )

  if (error) {
    throw new Error(
      error.message ||
        'Не удалось загрузить предметы класса',
    )
  }

  return (
    data || []
  ).map(
    normalizeWorkload,
  )
}


/* =========================================================
   NORMALIZE WORKLOAD
   ========================================================= */

function normalizeWorkload(
  workload,
) {
  return {
    id:
      workload.id,

    schoolId:
      workload.school_id,

    teacherId:
      workload.teacher_id,

    teacherName:
      workload.teacher?.name ||
      '',

    teacherRole:
      workload.teacher?.role ||
      '',

    className:
      workload.class_name ||
      '',

    subject:
      workload.subject ||
      '',

    weeklyHours:
      Number(
        workload.weekly_hours ||
          0,
      ),

    groupName:
      workload.group_name ||
      '',

    academicYear:
      workload.academic_year ||
      '',

    notes:
      workload.notes ||
      '',

    createdBy:
      workload.created_by ||
      null,

    createdAt:
      workload.created_at ||
      '',

    updatedAt:
      workload.updated_at ||
      '',
  }
}


/* =========================================================
   NORMALIZE TEACHER
   ========================================================= */

function normalizeTeacher(
  teacher,
) {
  return {
    id:
      teacher.id,

    name:
      teacher.name ||
      'Без имени',

    role:
      teacher.role ||
      '',

    position:
      teacher.position ||
      '',

    schoolId:
      teacher.school_id ||
      null,
  }
}


/* =========================================================
   VALIDATION
   ========================================================= */

function validateWorkload(
  workloadData,
) {
  if (
    !workloadData.teacherId
  ) {
    throw new Error(
      'Выберите учителя',
    )
  }

  if (
    !workloadData.className?.trim()
  ) {
    throw new Error(
      'Укажите класс',
    )
  }

  if (
    !workloadData.subject?.trim()
  ) {
    throw new Error(
      'Укажите предмет',
    )
  }

  const weeklyHours =
    Number(
      workloadData.weeklyHours,
    )

  if (
    !Number.isFinite(
      weeklyHours,
    ) ||
    weeklyHours < 1 ||
    weeklyHours > 40
  ) {
    throw new Error(
      'Количество часов должно быть от 1 до 40',
    )
  }
}