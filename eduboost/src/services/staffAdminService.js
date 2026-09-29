import {
  supabase,
} from '../lib/supabase'


/* ========================================
   HELPERS
======================================== */

function cleanText(
  value,
) {
  return String(
    value || '',
  ).trim()
}


async function getInvokeError(
  error,
  fallback,
) {
  try {
    if (
      error?.context &&
      typeof error.context.json ===
        'function'
    ) {
      const body =
        await error.context.json()

      if (
        body?.error
      ) {
        return body.error
      }
    }
  } catch (
    contextError
  ) {
    console.error(
      'Function error parse:',
      contextError,
    )
  }

  return (
    error?.message ||
    fallback
  )
}


function normalizeAssignment(
  assignment,
) {
  return {
    classId:
      cleanText(
        assignment?.classId,
      ),

    subject:
      cleanText(
        assignment?.subject,
      ),

    weeklyHours:
      Number(
        assignment?.weeklyHours ||
          1,
      ),

    groupName:
      cleanText(
        assignment?.groupName,
      ),
  }
}


function validateAssignments(
  assignments,
  {
    allowEmpty = false,
  } = {},
) {
  if (
    !Array.isArray(
      assignments,
    )
  ) {
    throw new Error(
      'Некорректный список назначений.',
    )
  }


  if (
    !allowEmpty &&
    assignments.length ===
      0
  ) {
    throw new Error(
      'Добавьте минимум один класс и предмет.',
    )
  }


  const normalizedAssignments =
    assignments.map(
      normalizeAssignment,
    )


  const seen =
    new Set()


  for (
    const assignment
    of normalizedAssignments
  ) {
    if (
      !assignment.classId
    ) {
      throw new Error(
        'Выберите класс.',
      )
    }


    if (
      !assignment.subject
    ) {
      throw new Error(
        'Укажите предмет.',
      )
    }


    if (
      assignment.subject.length >
      120
    ) {
      throw new Error(
        'Название предмета слишком длинное.',
      )
    }


    if (
      assignment.groupName.length >
      80
    ) {
      throw new Error(
        'Название подгруппы слишком длинное.',
      )
    }


    if (
      !Number.isInteger(
        assignment.weeklyHours,
      ) ||
      assignment.weeklyHours <
        1 ||
      assignment.weeklyHours >
        40
    ) {
      throw new Error(
        'Количество часов должно быть от 1 до 40.',
      )
    }


    const duplicateKey =
      [
        assignment.classId,

        assignment.subject
          .toLowerCase(),

        assignment.groupName
          .toLowerCase(),
      ].join('|')


    if (
      seen.has(
        duplicateKey,
      )
    ) {
      throw new Error(
        `Назначение «${assignment.subject}» для этого класса уже добавлено.`,
      )
    }


    seen.add(
      duplicateKey,
    )
  }


  return normalizedAssignments
}


/* ========================================
   CREATE TEACHER
======================================== */

export async function createTeacher({
  fullName,
  assignments,
  expiresHours = 168,
}) {
  const normalizedName =
    cleanText(
      fullName,
    )


  if (
    normalizedName.length <
    3
  ) {
    throw new Error(
      'Введите ФИО учителя.',
    )
  }


  if (
    normalizedName.length >
    160
  ) {
    throw new Error(
      'ФИО учителя слишком длинное.',
    )
  }


  const normalizedAssignments =
    validateAssignments(
      assignments,
    )


  const normalizedExpiresHours =
    Number(
      expiresHours,
    )


  if (
    !Number.isInteger(
      normalizedExpiresHours,
    ) ||
    normalizedExpiresHours <
      1 ||
    normalizedExpiresHours >
      720
  ) {
    throw new Error(
      'Некорректный срок действия ET-кода.',
    )
  }


  const {
    data,
    error,
  } =
    await supabase
      .functions
      .invoke(
        'create-teacher',
        {
          body: {
            fullName:
              normalizedName,

            assignments:
              normalizedAssignments,

            expiresHours:
              normalizedExpiresHours,
          },
        },
      )


  if (
    error
  ) {
    throw new Error(
      await getInvokeError(
        error,
        'Не удалось создать учителя.',
      ),
    )
  }


  if (
    data?.error
  ) {
    throw new Error(
      data.error,
    )
  }


  if (
    !data?.success ||
    !data?.teacherId ||
    !data?.eduLogin ||
    !data?.activationCode
  ) {
    throw new Error(
      'Сервер вернул неполные данные.',
    )
  }


  return {
    teacherId:
      data.teacherId,

    fullName:
      data.fullName,

    eduLogin:
      data.eduLogin,

    activationCode:
      data.activationCode,

    role:
      data.role,

    schoolName:
      data.schoolName,

    expiresAt:
      data.expiresAt,

    assignments:
      Array.isArray(
        data.assignments,
      )
        ? data.assignments
        : [],
  }
}


/* ========================================
   UPDATE TEACHER
======================================== */

export async function updateTeacher({
  teacherId,
  fullName,
  position = 'Учитель',
  assignments = [],
}) {
  const normalizedTeacherId =
    cleanText(
      teacherId,
    )


  const normalizedName =
    cleanText(
      fullName,
    )


  const normalizedPosition =
    cleanText(
      position,
    ) ||
    'Учитель'


  if (
    !normalizedTeacherId
  ) {
    throw new Error(
      'Не найден ID учителя.',
    )
  }


  if (
    normalizedName.length <
    3
  ) {
    throw new Error(
      'Введите ФИО учителя.',
    )
  }


  if (
    normalizedName.length >
    160
  ) {
    throw new Error(
      'ФИО учителя слишком длинное.',
    )
  }


  if (
    normalizedPosition.length >
    120
  ) {
    throw new Error(
      'Название должности слишком длинное.',
    )
  }


  const normalizedAssignments =
    validateAssignments(
      assignments,
      {
        allowEmpty:
          true,
      },
    )


  const {
    data,
    error,
  } =
    await supabase
      .functions
      .invoke(
        'update-teacher',
        {
          body: {
            teacherId:
              normalizedTeacherId,

            fullName:
              normalizedName,

            position:
              normalizedPosition,

            assignments:
              normalizedAssignments,
          },
        },
      )


  if (
    error
  ) {
    throw new Error(
      await getInvokeError(
        error,
        'Не удалось изменить данные учителя.',
      ),
    )
  }


  if (
    data?.error
  ) {
    throw new Error(
      data.error,
    )
  }


  if (
    !data?.success ||
    !data?.teacherId
  ) {
    throw new Error(
      'Сервер вернул неполные данные после изменения учителя.',
    )
  }


  return {
    teacherId:
      data.teacherId,

    fullName:
      data.fullName,

    position:
      data.position,

    eduLogin:
      data.eduLogin,

    assignments:
      Array.isArray(
        data.assignments,
      )
        ? data.assignments
        : [],

    message:
      data.message ||
      'Данные учителя обновлены.',
  }
}


/* ========================================
   REISSUE TEACHER ET
======================================== */

export async function reissueTeacherEt({
  teacherId,
  expiresHours = 168,
}) {
  const normalizedTeacherId =
    cleanText(
      teacherId,
    )


  if (
    !normalizedTeacherId
  ) {
    throw new Error(
      'Не найден ID учителя.',
    )
  }


  const normalizedExpiresHours =
    Number(
      expiresHours,
    )


  if (
    !Number.isInteger(
      normalizedExpiresHours,
    ) ||
    normalizedExpiresHours <
      1 ||
    normalizedExpiresHours >
      720
  ) {
    throw new Error(
      'Некорректный срок действия ET-кода.',
    )
  }


  const {
    data,
    error,
  } =
    await supabase
      .functions
      .invoke(
        'reissue-staff-code',
        {
          body: {
            teacherId:
              normalizedTeacherId,

            expiresHours:
              normalizedExpiresHours,
          },
        },
      )


  if (
    error
  ) {
    throw new Error(
      await getInvokeError(
        error,
        'Не удалось выдать новый ET-код.',
      ),
    )
  }


  if (
    data?.error
  ) {
    throw new Error(
      data.error,
    )
  }


  if (
    !data?.success ||
    !data?.teacherId ||
    !data?.eduLogin ||
    !data?.activationCode
  ) {
    throw new Error(
      'Сервер вернул неполные данные нового ET-кода.',
    )
  }


  return {
    teacherId:
      data.teacherId,

    fullName:
      data.fullName,

    eduLogin:
      data.eduLogin,

    activationCode:
      data.activationCode,

    expiresAt:
      data.expiresAt,

    message:
      data.message ||
      'Новый ET-код создан.',
  }
}


/* ========================================
   SET TEACHER ACCOUNT STATUS

   action:
   - deactivate
   - reactivate
======================================== */

export async function setTeacherAccountStatus({
  teacherId,
  action,
  reason = '',
}) {
  const normalizedTeacherId =
    cleanText(
      teacherId,
    )


  const normalizedAction =
    cleanText(
      action,
    )
      .toLowerCase()


  const normalizedReason =
    cleanText(
      reason,
    )


  if (
    !normalizedTeacherId
  ) {
    throw new Error(
      'Не найден ID учителя.',
    )
  }


  if (
    ![
      'deactivate',
      'reactivate',
    ].includes(
      normalizedAction,
    )
  ) {
    throw new Error(
      'Некорректное действие со статусом учителя.',
    )
  }


  if (
    normalizedAction ===
      'deactivate' &&
    normalizedReason.length <
      3
  ) {
    throw new Error(
      'Укажите причину деактивации.',
    )
  }


  if (
    normalizedReason.length >
    500
  ) {
    throw new Error(
      'Причина слишком длинная. Максимум 500 символов.',
    )
  }


  const {
    data,
    error,
  } =
    await supabase
      .functions
      .invoke(
        'set-teacher-status',
        {
          body: {
            teacherId:
              normalizedTeacherId,

            action:
              normalizedAction,

            reason:
              normalizedReason,
          },
        },
      )


  if (
    error
  ) {
    throw new Error(
      await getInvokeError(
        error,
        normalizedAction ===
          'deactivate'
          ? 'Не удалось деактивировать учителя.'
          : 'Не удалось восстановить доступ учителя.',
      ),
    )
  }


  if (
    data?.error
  ) {
    throw new Error(
      data.error,
    )
  }


  if (
    !data?.success ||
    !data?.teacherId ||
    !data?.status
  ) {
    throw new Error(
      'Сервер вернул неполные данные статуса учителя.',
    )
  }


  return {
    teacherId:
      data.teacherId,

    fullName:
      data.fullName,

    eduLogin:
      data.eduLogin,

    status:
      data.status,

    changed:
      data.changed !==
      false,

    revokedEtCount:
      Number(
        data.revokedEtCount ||
          0,
      ),

    message:
      data.message ||
      (
        normalizedAction ===
          'deactivate'
          ? 'Доступ учителя деактивирован.'
          : 'Доступ учителя восстановлен.'
      ),
  }
}


/* ========================================
   GET SCHOOL TEACHERS
======================================== */

export async function getSchoolTeachers(
  schoolId,
) {
  if (
    !schoolId
  ) {
    return []
  }


  /* =====================================
     PROFILES
  ===================================== */

  const {
    data:
      teacherRows,

    error:
      teachersError,
  } =
    await supabase
      .from(
        'profiles',
      )
      .select(
        `
          id,
          name,
          role,
          school,
          school_id,
          position,
          edu_login,
          recovery_email_verified_at,
          created_at
        `,
      )
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


  if (
    teachersError
  ) {
    throw new Error(
      teachersError.message ||
        'Не удалось загрузить учителей.',
    )
  }


  const teachers =
    teacherRows ||
    []


  if (
    teachers.length ===
    0
  ) {
    return []
  }


  const teacherIds =
    teachers.map(
      (
        teacher,
      ) =>
        teacher.id,
    )


  /* =====================================
     WORKLOAD + ACCOUNT STATUS
  ===================================== */

  const [
    workloadResult,
    statusResult,
  ] =
    await Promise.all([
      supabase
        .from(
          'teacher_workloads',
        )
        .select(
          `
            id,
            teacher_id,
            class_name,
            subject,
            weekly_hours,
            group_name,
            academic_year
          `,
        )
        .eq(
          'school_id',
          schoolId,
        )
        .in(
          'teacher_id',
          teacherIds,
        )
        .order(
          'class_name',
          {
            ascending:
              true,
          },
        ),

      supabase
        .from(
          'staff_account_status',
        )
        .select(
          `
            user_id,
            school_id,
            status,
            deactivated_at,
            deactivated_by,
            deactivation_reason,
            reactivated_at,
            reactivated_by,
            updated_at
          `,
        )
        .eq(
          'school_id',
          schoolId,
        )
        .in(
          'user_id',
          teacherIds,
        ),
    ])


  /* =====================================
     WORKLOAD ERROR
  ===================================== */

  if (
    workloadResult.error
  ) {
    throw new Error(
      workloadResult.error
        .message ||
        'Не удалось загрузить нагрузку учителей.',
    )
  }


  /* =====================================
     STATUS ERROR
  ===================================== */

  if (
    statusResult.error
  ) {
    throw new Error(
      statusResult.error
        .message ||
        'Не удалось загрузить статусы аккаунтов учителей.',
    )
  }


  const workloads =
    workloadResult.data ||
    []


  const statusRows =
    statusResult.data ||
    []


  /* =====================================
     GROUP WORKLOADS
  ===================================== */

  const workloadsByTeacher =
    new Map()


  for (
    const workload
    of workloads
  ) {
    const teacherId =
      workload.teacher_id


    if (
      !workloadsByTeacher.has(
        teacherId,
      )
    ) {
      workloadsByTeacher.set(
        teacherId,
        [],
      )
    }


    workloadsByTeacher
      .get(
        teacherId,
      )
      .push({
        id:
          workload.id,

        className:
          workload.class_name,

        subject:
          workload.subject,

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
      })
  }


  /* =====================================
     STATUS MAP

     Отсутствие строки =
     аккаунт активен.
  ===================================== */

  const statusByTeacher =
    new Map()


  for (
    const statusRow
    of statusRows
  ) {
    statusByTeacher.set(
      statusRow.user_id,
      statusRow,
    )
  }


  /* =====================================
     RESULT
  ===================================== */

  return teachers.map(
    (
      teacher,
    ) => {
      const statusRow =
        statusByTeacher.get(
          teacher.id,
        ) ||
        null


      const accountStatus =
        statusRow?.status ===
        'deactivated'
          ? 'deactivated'
          : 'active'


      return {
        id:
          teacher.id,

        name:
          teacher.name,

        role:
          teacher.role,

        school:
          teacher.school,

        schoolId:
          teacher.school_id,

        position:
          teacher.position ||
          'Учитель',

        eduLogin:
          teacher.edu_login ||
          '',

        recoveryEmailVerifiedAt:
          teacher.recovery_email_verified_at ||
          null,

        hasVerifiedRecoveryEmail:
          Boolean(
            teacher.recovery_email_verified_at,
          ),

        createdAt:
          teacher.created_at,

        assignments:
          workloadsByTeacher.get(
            teacher.id,
          ) ||
          [],


        /* ===============================
           ACCOUNT STATUS
        =============================== */

        accountStatus,

        isDeactivated:
          accountStatus ===
          'deactivated',

        deactivatedAt:
          statusRow
            ?.deactivated_at ||
          null,

        deactivatedBy:
          statusRow
            ?.deactivated_by ||
          null,

        deactivationReason:
          statusRow
            ?.deactivation_reason ||
          '',

        reactivatedAt:
          statusRow
            ?.reactivated_at ||
          null,

        reactivatedBy:
          statusRow
            ?.reactivated_by ||
          null,

        statusUpdatedAt:
          statusRow
            ?.updated_at ||
          null,
      }
    },
  )
}