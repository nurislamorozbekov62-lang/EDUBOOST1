import {
  supabase,
} from '../lib/supabase'


/* ========================================
   ISSUE RECOVERY CODE
   ADMIN ONLY
======================================== */

export async function issueStudentRecoveryCode(
  studentId,
  expiresMinutes = 30,
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
      'issue_student_recovery_code',
      {
        p_student_id:
          studentId,

        p_expires_minutes:
          expiresMinutes,
      },
    )


  if (error) {
    console.error(
      'Issue recovery code:',
      error,
    )


    throw new Error(
      error.message ||
        'Не удалось создать код восстановления.',
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
      'Код восстановления не был создан.',
    )
  }


  if (
    !result.recovery_code
  ) {
    throw new Error(
      'Supabase не вернул код восстановления.',
    )
  }


  return {
    studentId:
      result.student_id,

    fullName:
      result.full_name ||
      '',

    studentLogin:
      result.student_login ||
      '',

    recoveryCode:
      result.recovery_code,

    expiresAt:
      result.expires_at,
  }
}


/* ========================================
   RECOVER ACCESS
   PUBLIC STUDENT FLOW
======================================== */

export async function recoverStudentAccess({
  studentLogin,
  recoveryCode,
  newPassword,
}) {
  const normalizedLogin =
    String(
      studentLogin || '',
    )
      .trim()
      .toUpperCase()


  const normalizedCode =
    String(
      recoveryCode || '',
    )
      .trim()
      .toUpperCase()


  if (
    !/^EDU-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(
      normalizedLogin,
    )
  ) {
    throw new Error(
      'Введите корректный EDU-логин.',
    )
  }


  if (
    !/^ER-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}$/.test(
      normalizedCode,
    )
  ) {
    throw new Error(
      'Введите корректный код восстановления.',
    )
  }


  if (
    String(
      newPassword || '',
    ).length < 8
  ) {
    throw new Error(
      'Пароль должен содержать минимум 8 символов.',
    )
  }


  const {
    data,
    error,
  } =
    await supabase
      .functions
      .invoke(
        'recover-student-access',
        {
          body: {
            studentLogin:
              normalizedLogin,

            recoveryCode:
              normalizedCode,

            newPassword,
          },
        },
      )


  if (error) {
    console.error(
      'Recover access:',
      error,
    )


    throw new Error(
      data?.error ||
        error.message ||
        'Не удалось восстановить доступ.',
    )
  }


  if (
    !data?.success
  ) {
    throw new Error(
      data?.error ||
        'Не удалось восстановить доступ.',
    )
  }


  return {
    success:
      true,

    studentId:
      data.studentId,

    studentLogin:
      data.studentLogin,

    fullName:
      data.fullName ||
      '',
  }
}