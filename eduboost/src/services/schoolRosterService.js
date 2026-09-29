import {
  supabase,
} from '../lib/supabase'


function getCurrentAcademicYear() {
  const now =
    new Date()

  const year =
    now.getFullYear()

  const month =
    now.getMonth()

  return month >= 6
    ? `${year}/${year + 1}`
    : `${year - 1}/${year}`
}


/* =========================================================
   CLASSES FOR TEACHER

   Источник:
   teacher_workloads
========================================================= */

export async function getSupabaseSchoolClassesForTeacher(
  user,
) {
  if (
    !user?.id ||
    !user?.schoolId
  ) {
    return []
  }


  const {
    data,
    error,
  } = await supabase
    .from(
      'teacher_workloads',
    )
    .select(`
      class_name,
      academic_year
    `)
    .eq(
      'teacher_id',
      user.id,
    )
    .eq(
      'school_id',
      user.schoolId,
    )


  if (error) {
    throw new Error(
      error.message ||
        'Не удалось загрузить классы учителя.',
    )
  }


  const currentAcademicYear =
    getCurrentAcademicYear()


  const rows =
    (
      data || []
    ).filter(
      (
        workload,
      ) =>
        !workload.academic_year ||
        workload.academic_year ===
          currentAcademicYear,
    )


  return [
    ...new Set(
      rows
        .map(
          (
            workload,
          ) =>
            String(
              workload.class_name ||
                '',
            ).trim(),
        )
        .filter(
          Boolean,
        ),
    ),
  ].sort(
    (
      first,
      second,
    ) =>
      first.localeCompare(
        second,
        'ru',
        {
          numeric:
            true,
        },
      ),
  )
}


/* =========================================================
   OFFICIAL STUDENTS

   Учитель:
   используем защищённую RPC.

   Руководство:
   читаем официальный школьный реестр.

   ВАЖНО:
   profiles.class_name больше НЕ является
   источником состава класса.
========================================================= */

export async function getSupabaseStudentsByClass(
  user,
  className,
) {
  if (
    !user?.schoolId ||
    !className
  ) {
    return []
  }


  /*
    Для учителя используем уже созданную
    защищённую функцию.
  */

  if (
    user.role ===
    'Учитель'
  ) {
    const {
      data,
      error,
    } =
      await supabase.rpc(
        'get_teacher_class_students',
        {
          p_class_name:
            className,
        },
      )


    if (!error) {
      return normalizeRpcStudents(
        data,
        user,
        className,
      )
    }


    console.error(
      'RPC roster error:',
      error,
    )

    /*
      Если RPC по какой-то причине
      недоступна, пробуем официальный
      реестр напрямую.
    */
  }


  return loadOfficialRosterDirectly(
    user,
    className,
  )
}


/* =========================================================
   RPC NORMALIZER
========================================================= */

function normalizeRpcStudents(
  data,
  user,
  className,
) {
  return (
    data || []
  )
    .filter(
      (
        student,
      ) =>
        Boolean(
          student.student_id,
        ),
    )
    .map(
      (
        student,
      ) => ({
        /*
          id = auth/profile id.

          Старые таблицы grades /
          attendance_records пока
          продолжают использовать его.
        */

        id:
          student.student_id,

        schoolStudentId:
          student.school_student_id,

        name:
          student.full_name ||
          'Ученик',

        role:
          'Ученик',

        school:
          user.school ||
          '',

        schoolId:
          student.school_id ||
          user.schoolId,

        className:
          student.class_name ||
          className,

        academicYear:
          student.academic_year ||
          '',

        studentLogin:
          student.student_login ||
          '',

        isActivated:
          true,
      }),
    )
    .sort(
      (
        first,
        second,
      ) =>
        first.name.localeCompare(
          second.name,
          'ru',
        ),
    )
}


/* =========================================================
   DIRECT OFFICIAL ROSTER

   school_classes
       ↓
   student_enrollments
       ↓
   school_students
========================================================= */

async function loadOfficialRosterDirectly(
  user,
  className,
) {
  const academicYear =
    getCurrentAcademicYear()


  /*
    1. Находим официальный класс.
  */

  let {
    data: classRows,
    error: classError,
  } = await supabase
    .from(
      'school_classes',
    )
    .select(`
      id,
      school_id,
      class_name,
      academic_year,
      is_active
    `)
    .eq(
      'school_id',
      user.schoolId,
    )
    .eq(
      'class_name',
      className,
    )
    .eq(
      'academic_year',
      academicYear,
    )
    .eq(
      'is_active',
      true,
    )


  if (classError) {
    throw new Error(
      classError.message ||
        'Не удалось найти класс.',
    )
  }


  /*
    Fallback для старого учебного года.
  */

  if (
    !classRows ||
    classRows.length ===
      0
  ) {
    const fallback =
      await supabase
        .from(
          'school_classes',
        )
        .select(`
          id,
          school_id,
          class_name,
          academic_year,
          is_active
        `)
        .eq(
          'school_id',
          user.schoolId,
        )
        .eq(
          'class_name',
          className,
        )
        .eq(
          'is_active',
          true,
        )
        .order(
          'academic_year',
          {
            ascending:
              false,
          },
        )
        .limit(1)


    if (fallback.error) {
      throw new Error(
        fallback.error.message ||
          'Не удалось загрузить класс.',
      )
    }


    classRows =
      fallback.data ||
      []
  }


  const schoolClass =
    classRows?.[0]


  if (!schoolClass) {
    return []
  }


  /*
    2. Получаем официальные зачисления.
  */

  const {
    data: enrollmentRows,
    error: enrollmentError,
  } = await supabase
    .from(
      'student_enrollments',
    )
    .select(`
      student_id,
      class_id,
      school_id,
      academic_year,
      status
    `)
    .eq(
      'school_id',
      user.schoolId,
    )
    .eq(
      'class_id',
      schoolClass.id,
    )
    .eq(
      'status',
      'active',
    )


  if (enrollmentError) {
    throw new Error(
      enrollmentError.message ||
        'Не удалось загрузить состав класса.',
    )
  }


  const rosterIds =
    (
      enrollmentRows ||
      []
    )
      .map(
        (
          enrollment,
        ) =>
          enrollment.student_id,
      )
      .filter(
        Boolean,
      )


  if (
    rosterIds.length ===
    0
  ) {
    return []
  }


  /*
    3. Получаем учеников только
       из официального реестра.
  */

  const {
    data: studentRows,
    error: studentError,
  } = await supabase
    .from(
      'school_students',
    )
    .select(`
      id,
      user_id,
      school_id,
      full_name,
      student_login,
      status,
      is_archived
    `)
    .eq(
      'school_id',
      user.schoolId,
    )
    .eq(
      'status',
      'active',
    )
    .eq(
      'is_archived',
      false,
    )
    .not(
      'user_id',
      'is',
      null,
    )
    .in(
      'id',
      rosterIds,
    )
    .order(
      'full_name',
      {
        ascending:
          true,
      },
    )


  if (studentError) {
    throw new Error(
      studentError.message ||
        'Не удалось загрузить учеников.',
    )
  }


  return (
    studentRows || []
  ).map(
    (
      student,
    ) => ({
      id:
        student.user_id,

      schoolStudentId:
        student.id,

      name:
        student.full_name ||
        'Ученик',

      role:
        'Ученик',

      school:
        user.school ||
        '',

      schoolId:
        student.school_id,

      className:
        schoolClass.class_name,

      academicYear:
        schoolClass.academic_year,

      studentLogin:
        student.student_login ||
        '',

      isActivated:
        Boolean(
          student.user_id,
        ),
    }),
  )
}