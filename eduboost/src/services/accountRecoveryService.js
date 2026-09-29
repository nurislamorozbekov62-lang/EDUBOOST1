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


function normalizeEmail(
  value,
) {
  return cleanText(
    value,
  ).toLowerCase()
}


function normalizeRecoveryEduLogin(
  value,
) {
  const normalized =
    cleanText(
      value,
    )
      .toUpperCase()
      .replace(
        /\s+/g,
        '',
      )


  if (
    /^[0-9]{6}$/.test(
      normalized,
    )
  ) {
    return `EDU-${normalized}`
  }


  return normalized
}


async function getFunctionError(
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
    parseError
  ) {
    console.error(
      'Recovery function error parse:',
      parseError,
    )
  }


  return (
    error?.message ||
    fallback
  )
}


/* ========================================
   1. SEND RECOVERY EMAIL VERIFICATION

   Используется после первого входа:
   учитель/ученик вводит свой настоящий email.
======================================== */

export async function sendRecoveryEmailVerification(
  email,
) {
  const normalizedEmail =
    normalizeEmail(
      email,
    )


  if (
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
      normalizedEmail,
    )
  ) {
    throw new Error(
      'Введите корректный email.',
    )
  }


  const {
    data,
    error,
  } =
    await supabase
      .functions
      .invoke(
        'send-email-code',
        {
          body: {
            purpose:
              'verify_recovery_email',

            email:
              normalizedEmail,
          },
        },
      )


  if (
    error
  ) {
    throw new Error(
      await getFunctionError(
        error,
        'Не удалось отправить код.',
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
    !data?.success
  ) {
    throw new Error(
      'Сервер не подтвердил отправку кода.',
    )
  }


  return data
}


/* ========================================
   2. VERIFY RECOVERY EMAIL

   Проверяет 6 цифр и сохраняет
   recovery_email в profiles.
======================================== */

export async function verifyRecoveryEmailCode(
  code,
) {
  const normalizedCode =
    cleanText(
      code,
    )
      .replace(
        /[\s-]/g,
        '',
      )


  if (
    !/^[0-9]{6}$/.test(
      normalizedCode,
    )
  ) {
    throw new Error(
      'Введите 6-значный код из письма.',
    )
  }


  const {
    data,
    error,
  } =
    await supabase
      .functions
      .invoke(
        'verify-email-code',
        {
          body: {
            code:
              normalizedCode,
          },
        },
      )


  if (
    error
  ) {
    throw new Error(
      await getFunctionError(
        error,
        'Не удалось подтвердить email.',
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
    !data?.success
  ) {
    throw new Error(
      'Сервер не подтвердил email.',
    )
  }


  return data
}


/* ========================================
   3. SEND PASSWORD RECOVERY CODE

   Забыли пароль:
   EDU → письмо с OTP.
======================================== */

export async function sendPasswordRecoveryCode(
  eduLogin,
) {
  const normalizedLogin =
    normalizeRecoveryEduLogin(
      eduLogin,
    )


  if (
    !/^EDU-[0-9]{6}$/.test(
      normalizedLogin,
    )
  ) {
    throw new Error(
      'Введите EDU-логин в формате EDU-123456.',
    )
  }


  const {
    data,
    error,
  } =
    await supabase
      .functions
      .invoke(
        'send-email-code',
        {
          body: {
            purpose:
              'password_recovery',

            eduLogin:
              normalizedLogin,
          },
        },
      )


  if (
    error
  ) {
    throw new Error(
      await getFunctionError(
        error,
        'Не удалось отправить код восстановления.',
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
    !data?.success
  ) {
    throw new Error(
      'Сервер не подтвердил запрос восстановления.',
    )
  }


  return {
    ...data,

    eduLogin:
      normalizedLogin,
  }
}


/* ========================================
   4. RESET PASSWORD WITH EMAIL CODE

   EDU + OTP + новый пароль.
======================================== */

export async function resetPasswordWithEmailCode({
  eduLogin,
  code,
  newPassword,
}) {
  const normalizedLogin =
    normalizeRecoveryEduLogin(
      eduLogin,
    )


  const normalizedCode =
    cleanText(
      code,
    )
      .replace(
        /[\s-]/g,
        '',
      )


  const password =
    String(
      newPassword ||
      '',
    )


  if (
    !/^EDU-[0-9]{6}$/.test(
      normalizedLogin,
    )
  ) {
    throw new Error(
      'Введите корректный EDU-логин.',
    )
  }


  if (
    !/^[0-9]{6}$/.test(
      normalizedCode,
    )
  ) {
    throw new Error(
      'Введите 6-значный код из письма.',
    )
  }


  if (
    password.length <
    8
  ) {
    throw new Error(
      'Пароль должен содержать минимум 8 символов.',
    )
  }


  if (
    password.length >
    72
  ) {
    throw new Error(
      'Пароль слишком длинный. Максимум 72 символа.',
    )
  }


  const {
    data,
    error,
  } =
    await supabase
      .functions
      .invoke(
        'reset-password-email',
        {
          body: {
            eduLogin:
              normalizedLogin,

            code:
              normalizedCode,

            newPassword:
              password,
          },
        },
      )


  if (
    error
  ) {
    throw new Error(
      await getFunctionError(
        error,
        'Не удалось изменить пароль.',
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
    !data?.success
  ) {
    throw new Error(
      'Сервер не подтвердил смену пароля.',
    )
  }


  return data
}