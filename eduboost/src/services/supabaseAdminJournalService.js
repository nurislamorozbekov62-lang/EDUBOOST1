import {
  supabase,
} from '../lib/supabase'


/* =========================================================
   SCHOOL STUDENTS
========================================================= */

export async function getAdminSchoolStudents(
  user,
) {
  if (!user?.schoolId) {
    throw new Error(
      'У пользователя не указан school_id.',
    )
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
      school,
      school_id,
      class_name
    `)
    .eq(
      'school_id',
      user.schoolId,
    )
    .eq(
      'role',
      'Ученик',
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
        'Не удалось загрузить учеников школы.',
    )
  }

  return (
    data || []
  ).map(
    normalizeStudent,
  )
}


/* =========================================================
   SCHOOL CLASSES
========================================================= */

export async function getAdminSchoolClasses(
  user,
) {
  const students =
    await getAdminSchoolStudents(
      user,
    )

  return [
    ...new Set(
      students
        .map(
          (student) =>
            student.className,
        )
        .filter(Boolean),
    ),
  ].sort(
    (
      firstClass,
      secondClass,
    ) =>
      firstClass.localeCompare(
        secondClass,
        'ru',
        {
          numeric: true,
          sensitivity: 'base',
        },
      ),
  )
}


/* =========================================================
   STUDENTS BY CLASS
========================================================= */

export async function getAdminStudentsByClass(
  user,
  className,
) {
  if (!user?.schoolId) {
    throw new Error(
      'У пользователя не указан school_id.',
    )
  }

  if (!className) {
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
      school,
      school_id,
      class_name
    `)
    .eq(
      'school_id',
      user.schoolId,
    )
    .eq(
      'role',
      'Ученик',
    )
    .eq(
      'class_name',
      className,
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
        'Не удалось загрузить учеников класса.',
    )
  }

  return (
    data || []
  ).map(
    normalizeStudent,
  )
}


/* =========================================================
   SCHOOL TEACHERS
========================================================= */

export async function getAdminSchoolTeachers(
  user,
) {
  if (!user?.schoolId) {
    throw new Error(
      'У пользователя не указан school_id.',
    )
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
      school,
      school_id,
      position
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
        'Не удалось загрузить учителей школы.',
    )
  }

  return (
    data || []
  ).map(
    normalizeTeacher,
  )
}


/* =========================================================
   NORMALIZE STUDENT
========================================================= */

function normalizeStudent(
  student,
) {
  return {
    id:
      student.id,

    name:
      student.name ||
      'Без имени',

    role:
      student.role ||
      'Ученик',

    school:
      student.school ||
      '',

    schoolId:
      student.school_id ||
      null,

    className:
      student.class_name ||
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
      'Учитель',

    role:
      teacher.role ||
      'Учитель',

    school:
      teacher.school ||
      '',

    schoolId:
      teacher.school_id ||
      null,

    position:
      teacher.position ||
      '',
  }
}