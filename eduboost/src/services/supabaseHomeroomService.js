import {
  supabase,
} from '../lib/supabase'


/* =========================================================
   HOMEROOM INFO

   Возвращает объект:
   {
     "6 класс": {
       classId, className, academicYear,
       teacherId, teacherName
     },
     ...
   }
========================================================= */

export async function getHomeroomInfo(
  user,
) {
  if (!user?.schoolId) {
    return {}
  }


  const {
    data,
    error,
  } =
    await supabase
      .from(
        'school_classes',
      )
      .select(`
        id,
        class_name,
        academic_year,
        homeroom_teacher_id
      `)
      .eq(
        'school_id',
        user.schoolId,
      )
      .eq(
        'is_active',
        true,
      )
      .order(
        'class_name',
        {
          ascending:
            true,
        },
      )


  if (error) {
    throw new Error(
      error.message ||
        'Не удалось загрузить классных руководителей',
    )
  }


  const rows =
    Array.isArray(
      data,
    )
      ? data
      : []


  const teacherIds =
    [
      ...new Set(
        rows
          .map(
            (
              row,
            ) =>
              row
                .homeroom_teacher_id,
          )
          .filter(
            Boolean,
          ),
      ),
    ]


  const teacherNameById =
    {}


  if (
    teacherIds.length > 0
  ) {
    const {
      data: teachers,
      error: teachersError,
    } =
      await supabase
        .from(
          'profiles',
        )
        .select(`
          id,
          name
        `)
        .in(
          'id',
          teacherIds,
        )


    if (
      teachersError
    ) {
      console.error(
        'Load homeroom teacher names:',
        teachersError,
      )
    }


    for (
      const teacher
      of teachers || []
    ) {
      teacherNameById[
        teacher.id
      ] =
        teacher.name ||
        'Учитель'
    }
  }


  const result =
    {}


  for (
    const row
    of rows
  ) {
    const key =
      String(
        row.class_name ||
          '',
      ).trim()


    if (!key) {
      continue
    }


    result[
      key
    ] = {
      classId:
        row.id,

      className:
        row.class_name,

      academicYear:
        row.academic_year ||
        '',

      teacherId:
        row
          .homeroom_teacher_id ||
        null,

      teacherName:
        row.homeroom_teacher_id
          ? teacherNameById[
              row
                .homeroom_teacher_id
            ] ||
            'Учитель'
          : '',
    }
  }


  return result
}


/* =========================================================
   SET HOMEROOM TEACHER

   teacherId = null → снять классрука
========================================================= */

export async function setHomeroomTeacher(
  classId,
  teacherId,
) {
  if (!classId) {
    throw new Error(
      'Класс не найден',
    )
  }


  const {
    data,
    error,
  } =
    await supabase.rpc(
      'set_homeroom_teacher',
      {
        p_class_id:
          classId,

        p_teacher_id:
          teacherId ||
          null,
      },
    )


  if (error) {
    throw new Error(
      error.message ||
        'Не удалось сохранить классного руководителя',
    )
  }


  return Boolean(
    data,
  )
}


/* =========================================================
   SCHOOL TEACHERS

   Для выпадающего списка в модалке.
========================================================= */

export async function getSchoolTeachersForHomeroom(
  schoolId,
) {
  if (!schoolId) {
    return []
  }


  const {
    data,
    error,
  } =
    await supabase
      .from(
        'profiles',
      )
      .select(`
        id,
        name,
        position
      `)
      .eq(
        'school_id',
        schoolId,
      )
      .eq(
        'role',
        'Учитель',
      )
      .order(
        'name',
        {
          ascending:
            true,
        },
      )


  if (error) {
    throw new Error(
      error.message ||
        'Не удалось загрузить учителей',
    )
  }


  return (
    data ||
    []
  ).map(
    (
      row,
    ) => ({
      id:
        row.id,

      name:
        row.name ||
        'Учитель',

      position:
        row.position ||
        '',
    }),
  )
}


/* =========================================================
   GET STUDENT PARENT CODE

   Вызывает RPC get_student_parent_code.
   Возвращает код EB-XXXXXX или бросает ошибку.
========================================================= */

export async function getStudentParentCode(
  studentProfileId,
) {
  if (!studentProfileId) {
    throw new Error(
      'Не указан ученик',
    )
  }


  const {
    data,
    error,
  } =
    await supabase.rpc(
      'get_student_parent_code',
      {
        p_student_profile_id:
          studentProfileId,
      },
    )


  if (error) {
    throw new Error(
      error.message ||
        'Не удалось получить код родителя',
    )
  }


  return String(
    data ||
      '',
  ).trim()
}


/* =========================================================
   HOMEROOM CLASSES FOR TEACHER

   Возвращает массив классов, где этот учитель —
   классный руководитель.

   Сортировка: по названию класса (по алфавиту).
========================================================= */

export async function getHomeroomClassesForTeacher(
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
  } =
    await supabase
      .from(
        'school_classes',
      )
      .select(`
        id,
        class_name,
        academic_year
      `)
      .eq(
        'school_id',
        user.schoolId,
      )
      .eq(
        'homeroom_teacher_id',
        user.id,
      )
      .eq(
        'is_active',
        true,
      )
      .order(
        'class_name',
        {
          ascending:
            true,
        },
      )


  if (error) {
    console.error(
      'getHomeroomClassesForTeacher:',
      error,
    )

    return []
  }


  const rows =
    Array.isArray(
      data,
    )
      ? data
      : []


  return rows.map(
    (
      row,
    ) => ({
      classId:
        row.id,

      className:
        row.class_name,

      academicYear:
        row.academic_year ||
        '',
    }),
  )
}


/* =========================================================
   HOMEROOM STUDENTS

   Официальный roster класса для классрука.

   Читаем напрямую:
   school_classes → student_enrollments → school_students.

   НЕ фильтруем по teacher_workloads (классрук может
   не преподавать в своём классе).

   НЕ скрываем неактивированных (user_id IS NULL) —
   классрук должен видеть всех учеников класса.
========================================================= */

export async function getHomeroomStudents(
  user,
  className,
) {
  if (
    !user?.schoolId ||
    !className
  ) {
    return []
  }


  /* 1. Находим класс */

  const {
    data: classRows,
    error: classError,
  } =
    await supabase
      .from(
        'school_classes',
      )
      .select(`
        id,
        class_name,
        academic_year
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


  if (classError) {
    throw new Error(
      classError.message ||
        'Не удалось найти класс.',
    )
  }


  const schoolClass =
    classRows?.[0]


  if (!schoolClass) {
    return []
  }


  /* 2. Активные зачисления класса */

  const {
    data: enrollments,
    error: enrollmentError,
  } =
    await supabase
      .from(
        'student_enrollments',
      )
      .select(`
        student_id
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
      .is(
        'ended_at',
        null,
      )


  if (enrollmentError) {
    throw new Error(
      enrollmentError.message ||
        'Не удалось загрузить состав класса.',
    )
  }


  const studentIds =
    (
      enrollments ||
      []
    )
      .map(
        (
          row,
        ) =>
          row.student_id,
      )
      .filter(
        Boolean,
      )


  if (
    studentIds.length ===
    0
  ) {
    return []
  }


  /* 3. Ученики — включая неактивированных */

  const {
    data: studentRows,
    error: studentError,
  } =
    await supabase
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
        'is_archived',
        false,
      )
      .in(
        'id',
        studentIds,
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
    studentRows ||
    []
  ).map(
    (
      student,
    ) => ({
      schoolStudentId:
        student.id,

      profileId:
        student.user_id ||
        null,

      name:
        student.full_name ||
        'Ученик',

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