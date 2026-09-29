import {
  supabase,
} from '../lib/supabase'


/* ========================================
   SCHOOL CLASSES
======================================== */

export async function getSchoolClasses(
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
        'school_classes',
      )
      .select(
        `
          id,
          school_id,
          academic_year,
          class_name,
          grade_level,
          is_active
        `,
      )
      .eq(
        'school_id',
        schoolId,
      )
      .eq(
        'is_active',
        true,
      )
      .order(
        'grade_level',
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
    console.error(
      'Load classes:',
      error,
    )

    throw new Error(
      error.message ||
        'Не удалось загрузить классы.',
    )
  }


  return (
    data || []
  ).map(
    normalizeClass,
  )
}


/* ========================================
   SCHOOL STUDENTS
======================================== */

export async function getSchoolStudents(
  schoolId,
) {
  if (!schoolId) {
    return []
  }


  /* ========================================
     STUDENTS
  ======================================== */

  const {
    data:
      studentRows,

    error:
      studentsError,
  } =
    await supabase
      .from(
        'school_students',
      )
      .select(
        `
          id,
          school_id,
          user_id,
          full_name,
          student_login,
          status,
          is_archived,
          archived_at,
          created_at
        `,
      )
      .eq(
        'school_id',
        schoolId,
      )
      .order(
        'full_name',
        {
          ascending: true,
        },
      )


  if (
    studentsError
  ) {
    console.error(
      'Load students:',
      studentsError,
    )

    throw new Error(
      studentsError.message ||
        'Не удалось загрузить учеников.',
    )
  }


  const students =
    studentRows || []


  if (
    students.length ===
    0
  ) {
    return []
  }


  const studentIds =
    students.map(
      (student) =>
        student.id,
    )


  /* ========================================
     ACTIVE ENROLLMENTS
  ======================================== */

  const {
    data:
      enrollmentRows,

    error:
      enrollmentError,
  } =
    await supabase
      .from(
        'student_enrollments',
      )
      .select(
        `
          id,
          student_id,
          class_id,
          academic_year,
          status
        `,
      )
      .in(
        'student_id',
        studentIds,
      )
      .eq(
        'status',
        'active',
      )


  if (
    enrollmentError
  ) {
    console.error(
      'Load enrollments:',
      enrollmentError,
    )

    throw new Error(
      enrollmentError.message ||
        'Не удалось загрузить классы учеников.',
    )
  }


  const enrollments =
    enrollmentRows || []


  const classIds =
    [
      ...new Set(
        enrollments
          .map(
            (item) =>
              item.class_id,
          )
          .filter(
            Boolean,
          ),
      ),
    ]


  /* ========================================
     CLASSES
  ======================================== */

  let classes = []


  if (
    classIds.length >
    0
  ) {
    const {
      data:
        classRows,

      error:
        classesError,
    } =
      await supabase
        .from(
          'school_classes',
        )
        .select(
          `
            id,
            class_name,
            grade_level,
            academic_year
          `,
        )
        .in(
          'id',
          classIds,
        )


    if (
      classesError
    ) {
      console.error(
        'Load student classes:',
        classesError,
      )

      throw new Error(
        classesError.message ||
          'Не удалось загрузить названия классов.',
      )
    }


    classes =
      classRows || []
  }


  const classMap =
    new Map(
      classes.map(
        (item) => [
          item.id,
          item,
        ],
      ),
    )


  const enrollmentMap =
    new Map(
      enrollments.map(
        (item) => [
          item.student_id,
          item,
        ],
      ),
    )


  /* ========================================
     NORMALIZED STUDENTS
  ======================================== */

  return students.map(
    (student) => {
      const enrollment =
        enrollmentMap.get(
          student.id,
        )


      const classRow =
        enrollment
          ? classMap.get(
              enrollment.class_id,
            )
          : null


      return {
        id:
          student.id,

        fullName:
          student.full_name ||
          '',

        schoolId:
          student.school_id ||
          null,

        userId:
          student.user_id ||
          null,

        studentLogin:
          student.student_login ||
          '',

        status:
          student.status ||
          'active',

        activated:
          Boolean(
            student.user_id,
          ),

        isArchived:
          Boolean(
            student.is_archived,
          ),

        archivedAt:
          student.archived_at ||
          null,

        classId:
          classRow?.id ||
          null,

        className:
          classRow
            ?.class_name ||
          '',

        academicYear:
          enrollment
            ?.academic_year ||
          classRow
            ?.academic_year ||
          '',

        createdAt:
          student.created_at ||
          '',
      }
    },
  )
}


/* ========================================
   CREATE STUDENT
======================================== */

export async function createSchoolStudent({
  fullName,
  classId,
  expiresHours = 168,
}) {
  const cleanName =
    String(
      fullName || '',
    ).trim()


  if (
    cleanName.length <
    2
  ) {
    throw new Error(
      'Введите ФИО ученика.',
    )
  }


  if (!classId) {
    throw new Error(
      'Выберите класс.',
    )
  }


  const {
    data,
    error,
  } =
    await supabase.rpc(
      'create_school_student_with_code',
      {
        p_full_name:
          cleanName,

        p_class_id:
          classId,

        p_expires_hours:
          expiresHours,
      },
    )


  if (error) {
    console.error(
      'Create student:',
      error,
    )

    throw new Error(
      error.message ||
        'Не удалось создать ученика.',
    )
  }


  const created =
    Array.isArray(
      data,
    )
      ? data[0]
      : null


  if (!created) {
    throw new Error(
      'Ученик не был создан.',
    )
  }


  /* ========================================
     LOAD PERMANENT EDU LOGIN
  ======================================== */

  const {
    data:
      student,

    error:
      studentError,
  } =
    await supabase
      .from(
        'school_students',
      )
      .select(
        `
          id,
          student_login
        `,
      )
      .eq(
        'id',
        created.student_id,
      )
      .single()


  if (
    studentError
  ) {
    console.error(
      'Load created student:',
      studentError,
    )

    throw new Error(
      studentError.message ||
        'Ученик создан, но не удалось загрузить его EDU-логин.',
    )
  }


  return {
    studentId:
      created.student_id,

    fullName:
      created.full_name,

    schoolId:
      created.school_id,

    classId:
      created.class_id,

    className:
      created.class_name,

    academicYear:
      created.academic_year,

    activationCode:
      created.activation_code,

    expiresAt:
      created.expires_at,

    studentLogin:
      student
        ?.student_login ||
      '',
  }
}


/* ========================================
   REISSUE EB ACTIVATION CODE
======================================== */

export async function reissueStudentActivationCode(
  studentId,
  expiresHours = 168,
) {
  if (!studentId) {
    throw new Error(
      'Ученик не выбран.',
    )
  }


  const {
    data,
    error,
  } =
    await supabase.rpc(
      'reissue_student_activation_code',
      {
        p_student_id:
          studentId,

        p_expires_hours:
          expiresHours,
      },
    )


  if (error) {
    console.error(
      'Reissue EB code:',
      error,
    )

    throw new Error(
      error.message ||
        'Не удалось выдать новый EB-код.',
    )
  }


  const result =
    Array.isArray(
      data,
    )
      ? data[0]
      : null


  if (!result) {
    throw new Error(
      'Новый EB-код не был создан.',
    )
  }


  if (
    !result.activation_code
  ) {
    throw new Error(
      'Supabase не вернул новый EB-код.',
    )
  }


  return {
    studentId:
      result.student_id,

    fullName:
      result.full_name ||
      '',

    className:
      result.class_name ||
      '',

    activationCode:
      result.activation_code,

    expiresAt:
      result.expires_at,
  }
}


/* ========================================
   RESET ACTIVATED STUDENT ACCESS
======================================== */

export async function resetActivatedStudentAccess(
  studentId,
) {
  if (!studentId) {
    throw new Error(
      'Ученик не выбран.',
    )
  }


  const {
    data,
    error,
  } =
    await supabase
      .functions
      .invoke(
        'reset-student-access',
        {
          body: {
            studentId,
          },
        },
      )


  if (error) {
    console.error(
      'Reset access Edge Function:',
      error,
    )


    /*
      Иногда Edge Function возвращает
      ошибку отдельно от data.
    */

    throw new Error(
      error.message ||
        'Не удалось сбросить доступ ученика.',
    )
  }


  console.log(
    'Reset access result:',
    data,
  )


  if (
    !data
  ) {
    throw new Error(
      'Сервер не вернул результат сброса доступа.',
    )
  }


  if (
    data.success !==
    true
  ) {
    throw new Error(
      data.error ||
        'Не удалось сбросить доступ ученика.',
    )
  }


  if (
    !data.studentLogin
  ) {
    throw new Error(
      'Не удалось получить EDU-логин ученика.',
    )
  }


  if (
    !data.temporaryPassword
  ) {
    throw new Error(
      'Не удалось получить временный пароль ученика.',
    )
  }


  return {
    studentId:
      data.studentId ||
      studentId,

    fullName:
      data.fullName ||
      '',

    studentLogin:
      data.studentLogin,

    temporaryPassword:
      data.temporaryPassword,
  }
}


/* ========================================
   ARCHIVE / RESTORE STUDENT
======================================== */

export async function setSchoolStudentArchived(
  studentId,
  archived,
) {
  if (!studentId) {
    throw new Error(
      'Ученик не выбран.',
    )
  }


  const {
    data,
    error,
  } =
    await supabase.rpc(
      'set_school_student_archived',
      {
        p_student_id:
          studentId,

        p_archived:
          Boolean(
            archived,
          ),
      },
    )


  if (error) {
    console.error(
      'Archive student:',
      error,
    )

    throw new Error(
      error.message ||
        'Не удалось изменить состояние ученика.',
    )
  }


  const result =
    Array.isArray(
      data,
    )
      ? data[0]
      : null


  return result
}


/* ========================================
   DELETE UNACTIVATED STUDENT
======================================== */

export async function deleteUnactivatedSchoolStudent(
  studentId,
) {
  if (!studentId) {
    throw new Error(
      'Ученик не выбран.',
    )
  }


  const {
    data,
    error,
  } =
    await supabase.rpc(
      'delete_unactivated_school_student',
      {
        p_student_id:
          studentId,
      },
    )


  if (error) {
    console.error(
      'Delete student:',
      error,
    )

    throw new Error(
      error.message ||
        'Не удалось удалить ученика.',
    )
  }


  if (
    data !== true
  ) {
    throw new Error(
      'Supabase не подтвердил удаление ученика.',
    )
  }


  return true
}


/* ========================================
   NORMALIZE CLASS
======================================== */

function normalizeClass(
  row,
) {
  return {
    id:
      row.id,

    schoolId:
      row.school_id ||
      null,

    academicYear:
      row.academic_year ||
      '',

    className:
      row.class_name ||
      '',

    gradeLevel:
      Number(
        row.grade_level ||
          0,
      ),

    isActive:
      row.is_active !==
      false,
  }
}